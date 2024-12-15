import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { SubscriptionPaymentStatus, BankAccountStatus } from '@/lib/types'

import {
  extractIdsFromEvent,
  getRedisKey,
  setRedisKey,
} from '../../../lib/utils'
import { logEvent } from '../../../lib/utils'
import { handleError } from '../../../lib/utils'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  let event: Stripe.Event | null = null // Assign a default value

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

  try {
    // 2. Validate request and signature
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

    // Verify and construct the event
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    logEvent('Received', event.id, { eventType: event.type })

    // 3. Check for duplicate events
    const eventKey = `stripe_event:${event.id}`
    const isDuplicate = await getRedisKey(eventKey)
    if (isDuplicate) {
      console.warn(`🚨 Duplicate webhook detected: ${event.id}`)
      return NextResponse.json({ received: true })
    }

    await setRedisKey(eventKey, 'processed', 86400) // TTL: 1 day

    // 4. Handle event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        return handleInvoicePaymentSucceeded(event)
      case 'invoice.payment_failed':
        return handleInvoicePaymentFailed(event)
      case 'payment_method.attached':
        return handlePaymentMethodAttached(event)
      default:
        logEvent('Unhandled Event Type', event.id, { eventType: event.type })
        return NextResponse.json({ received: true })
    }
  } catch (error) {
    handleError('Webhook Handling', event?.id ?? 'unknown', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const { subscriptionId, customerId } = extractIdsFromEvent(event)

  if (!subscriptionId || !customerId) {
    console.warn('⚠️ Missing subscription or customer ID', {
      eventId: event.id,
    })
    return NextResponse.json({ received: true })
  }

  try {
    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Read Redis data for payment setup
    const redisKey = `payment_setup:${customerId}`
    const existingData = await getRedisKey(redisKey)
    console.log('🔍 Redis Data for Payment Setup:', { redisKey, existingData })

    // Read Redis data for bank account
    const bankAccountKey = `bank_account:${customerId}`
    const bankAccountData = await getRedisKey(bankAccountKey)
    console.log('🔍 Redis Data for Bank Account:', {
      bankAccountKey,
      bankAccountData,
    })

    // Determine bankVerified status
    let bankVerified = existingData?.bankVerified || false

    // Fallback check for bank verification
    if (!bankVerified) {
      console.log('🔍 Performing Fallback Check for Bank Verification...')
      if (bankAccountData?.verified) {
        bankVerified = true // Update bankVerified based on fallback data
        console.log('✅ Bank verification confirmed via fallback check.')
      } else {
        console.log('⚠️ Bank verification fallback check failed.')
      }
    }

    // Log the computed `bankVerified` value
    console.log('🔍 Computed Bank Verified Status:', { bankVerified })

    // Extract the invoice object to get the payment date
    const invoice = event.data.object as Stripe.Invoice // Cast to Stripe.Invoice
    const lastPaymentDate = (() => {
      if (invoice.status_transitions?.paid_at) {
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

    // Create the payment setup data
    const paymentSetupData: SubscriptionPaymentStatus = {
      subscriptionId,
      setupCompleted: true,
      subscriptionActive: subscription.status === 'active',
      bankVerified, // Final computed bankVerified status
      lastPaymentStatus: 'succeeded',
      lastPaymentDate,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      timestamp: Date.now(),
    }

    // Save the updated payment setup data to Redis
    await setRedisKey(redisKey, paymentSetupData, 86400) // TTL: 1 day
    logEvent('Processed Invoice Payment Succeeded', event.id, paymentSetupData)

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Invoice Payment Succeeded', event.id, error)
    throw error
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const { subscriptionId, customerId } = extractIdsFromEvent(event)

  if (!subscriptionId || !customerId) {
    console.warn('⚠️ Missing subscription or customer ID', {
      eventId: event.id,
    })
    return NextResponse.json({ received: true })
  }

  try {
    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    const redisKey = `payment_setup:${customerId}`
    const existingData = await getRedisKey(redisKey)
    const bankVerified = existingData?.bankVerified || false

    // Extract the invoice object to get the last payment date
    const invoice = event.data.object as Stripe.Invoice // Cast to Stripe.Invoice
    const lastPaymentDate = (() => {
      if (invoice.status_transitions?.finalized_at) {
        return new Date(
          invoice.status_transitions.finalized_at * 1000
        ).toISOString()
      }
      if (invoice.created) {
        return new Date(invoice.created * 1000).toISOString()
      }
      console.warn('⚠️ Missing timestamps for invoice', {
        invoiceId: invoice.id,
      })
      return new Date().toISOString()
    })()

    // Create the payment setup data
    const paymentSetupData: SubscriptionPaymentStatus = {
      subscriptionId,
      setupCompleted: false,
      subscriptionActive: subscription.status === 'active',
      bankVerified,
      lastPaymentStatus: 'failed',
      lastPaymentDate,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      timestamp: Date.now(),
    }

    await setRedisKey(redisKey, paymentSetupData, 86400)
    logEvent('Processed Invoice Payment Failed', event.id, paymentSetupData)

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Invoice Payment Failed', event.id, error)
    throw error
  }
}

async function handlePaymentMethodAttached(event: Stripe.Event) {
  const { customerId } = extractIdsFromEvent(event)

  if (!customerId) {
    console.warn('⚠️ Missing customer ID', { eventId: event.id })
    return NextResponse.json({ received: true })
  }

  try {
    const paymentMethod = event.data.object as Stripe.PaymentMethod

    if (
      paymentMethod.type === 'us_bank_account' &&
      paymentMethod.us_bank_account
    ) {
      const usBankAccount = paymentMethod.us_bank_account

      const bankAccountData: BankAccountStatus = {
        customerId,
        verified: Boolean(usBankAccount.financial_connections_account),
        last4: usBankAccount.last4,
        bankName: usBankAccount.bank_name,
        accountType: usBankAccount.account_type,
        accountHolderType: usBankAccount.account_holder_type,
        routingNumber: usBankAccount.routing_number,
        statusDetails: usBankAccount.status_details,
        timestamp: Date.now(),
      }

      const redisKey = `bank_account:${customerId}`
      console.log('🔍 Saving Bank Account Data to Redis:', {
        redisKey,
        bankAccountData,
      })
      await setRedisKey(redisKey, bankAccountData, 86400) // Save with a TTL of 1 day
      logEvent('Processed Bank Account Attached', event.id, bankAccountData)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Payment Method Attached', event.id, error)
    throw error
  }
}
