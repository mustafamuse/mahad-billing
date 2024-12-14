// /api/webhook.js

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'
import { SubscriptionPaymentStatus, BankAccountStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  let event: Stripe.Event

  // 1. Validate environment variables
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error(
      '❌ Missing Stripe API key or Webhook secret in environment variables'
    )
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }

  // 2. Validate request and signature
  try {
    const payload = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.warn('⚠️ Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.log(`✅ Event received: ${event.type} (ID: ${event.id})`)

    // 3. Check for duplicate events using Redis
    const eventId = event.id
    const eventKey = `stripe_event:${eventId}`

    try {
      const exists = await redis.get(eventKey)
      if (exists) {
        console.warn(`🚨 Duplicate webhook detected: ${eventId}`)
        return NextResponse.json({ received: true })
      }
      await redis.set(eventKey, 'processed', { ex: 86400 }) // TTL: 1 day
    } catch (err) {
      console.error('❌ Redis operation failed:', err.message)
      return NextResponse.json(
        { error: 'Event processing failed' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('❌ Webhook request validation failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid webhook request' },
      { status: 400 }
    )
  }

  // 4. Handle specific event types
  switch (event.type) {
    case 'invoice.payment_succeeded':
      return handleInvoicePaymentSucceeded(event)
    case 'invoice.payment_failed':
      return handleInvoicePaymentFailed(event)
    case 'payment_method.attached':
      return handlePaymentMethodAttached(event)
    default:
      console.warn(`Unhandled event type: ${event.type}`)
      return NextResponse.json({ received: true })
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  try {
    const invoice = event.data.object as Stripe.Invoice

    // Ensure subscription and customer IDs are present
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

    if (!subscriptionId || !customerId) {
      console.warn(
        '⚠️ Missing subscription or customer ID in invoice.payment_succeeded event',
        {
          eventId: event.id,
          invoiceId: invoice.id,
        }
      )
      return NextResponse.json({ received: true })
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const redisKey = `payment_setup:${customerId}`
    const existingData = await redis.get(redisKey)
    const bankVerified = existingData
      ? JSON.parse(existingData).bankVerified
      : false

    // Calculate payment date
    const lastPaymentDate = (() => {
      if (invoice.status_transitions && invoice.status_transitions.paid_at) {
        return new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      }
      if (invoice.created) {
        return new Date(invoice.created * 1000).toISOString()
      }
      console.warn('⚠️ Missing timestamps for invoice', {
        invoiceId: invoice.id,
      })
      return new Date().toISOString()
    })()

    const paymentSetupData: SubscriptionPaymentStatus = {
      subscriptionId: subscription.id,
      setupCompleted: true,
      subscriptionActive: subscription.status === 'active',
      bankVerified,
      lastPaymentStatus: 'succeeded',
      lastPaymentDate,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      timestamp: Date.now(),
    }

    await redis.set(redisKey, JSON.stringify(paymentSetupData))
    console.log('✅ Payment succeeded processed:', paymentSetupData)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error)
    throw error
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  try {
    const invoice = event.data.object as Stripe.Invoice

    // Handle both string ID and expanded subscription object
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id

    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

    if (!subscriptionId || !customerId) {
      console.log('Missing subscription or customer ID')
      return NextResponse.json({ received: true })
    }

    // Retrieve subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const redisKey = `payment_setup:${customerId}`

    // Fetch existing bank verification status from Redis
    const existingData = await redis.get(redisKey)
    const bankVerified = existingData
      ? JSON.parse(existingData).bankVerified
      : false

    // Construct the payment setup data
    const paymentSetupData: SubscriptionPaymentStatus = {
      subscriptionId: subscription.id,
      setupCompleted: false, // Payment failed, so setup isn't complete
      subscriptionActive: subscription.status === 'active',
      bankVerified, // Preserve the existing bank verification status
      lastPaymentStatus: 'failed',
      lastPaymentDate: new Date(
        invoice.status_transitions.finalized_at || invoice.created * 1000
      ).toISOString(),
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      timestamp: Date.now(),
    }

    // Update Redis with the new payment setup data
    await redis.set(redisKey, JSON.stringify(paymentSetupData))

    // Log the payment failure details
    console.log('Payment failed:', {
      customerId,
      subscriptionId,
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt,
      amount_due: invoice.amount_due,
      hosted_invoice_url: invoice.hosted_invoice_url,
      bankVerified,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error handling invoice.payment_failed:', error)
    throw error // Re-throw to trigger webhook retry
  }
}

async function handlePaymentMethodAttached(event: Stripe.Event) {
  try {
    const paymentMethod = event.data.object as Stripe.PaymentMethod
    const customerId = paymentMethod.customer as string

    if (!customerId) {
      console.warn('⚠️ No customer associated with this payment method')
      return NextResponse.json({ received: true })
    }

    if (
      paymentMethod.type === 'us_bank_account' &&
      paymentMethod.us_bank_account
    ) {
      const usBankAccount = paymentMethod.us_bank_account
      const verified = Boolean(usBankAccount.financial_connections_account)

      const bankAccountData: BankAccountStatus = {
        customerId,
        verified,
        last4: usBankAccount.last4,
        bankName: usBankAccount.bank_name,
        accountType: usBankAccount.account_type,
        accountHolderType: usBankAccount.account_holder_type,
        routingNumber: usBankAccount.routing_number,
        statusDetails: usBankAccount.status_details,
        timestamp: Date.now(),
      }

      const redisKey = `bank_account:${customerId}`
      await redis.set(redisKey, JSON.stringify(bankAccountData))

      console.log('✅ Bank account attached:', bankAccountData)

      const customer = await stripe.customers.retrieve(customerId)
      if ('invoice_settings' in customer && !customer.deleted) {
        if (!customer.invoice_settings.default_payment_method) {
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethod.id },
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error handling payment_method.attached:', error)
    throw error
  }
}
