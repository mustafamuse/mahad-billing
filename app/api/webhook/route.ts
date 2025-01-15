import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { SubscriptionPaymentStatus, BankAccountStatus } from '@/lib/types'
import { stripeServerClient } from '@/lib/utils/stripe'


import {
  extractIdsFromEvent,
  getRedisKey,
  setRedisKey,
} from '../../../lib/utils'
import { logEvent } from '../../../lib/utils'
import { handleError } from '../../../lib/utils'


export const dynamic = 'force-dynamic'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  let event: Stripe.Event | null = null

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

    event = stripeServerClient.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    )
    logEvent('Received', event.id, { eventType: event.type })

    const eventKey = `stripe_event:${event.id}`
    const isDuplicate = await getRedisKey(eventKey)
    if (isDuplicate) {
      console.warn(`🚨 Duplicate webhook detected: ${event.id}`)
      return NextResponse.json({ received: true })
    }

    await setRedisKey(eventKey, 'processed', 86400)

    switch (event.type) {
      case 'invoice.payment_succeeded':
        return handleInvoicePaymentSucceeded(event)
      case 'invoice.payment_failed':
        return handleInvoicePaymentFailed(event)
      case 'payment_method.attached':
        return handlePaymentMethodAttached(event)
      case 'payment_intent.succeeded':
        return handlePaymentIntentSucceeded(event)
      case 'payment_intent.processing':
        return handlePaymentIntentProcessing(event)
      case 'payment_intent.payment_failed':
        return handlePaymentIntentFailed(event)
      case 'payment_intent.canceled':
        return handlePaymentIntentCanceled(event)
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
    const subscription =
      await stripeServerClient.subscriptions.retrieve(subscriptionId)
    const invoice = event.data.object as Stripe.Invoice

    const firstPaymentDate = invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString()

    const redisKey = `payment_setup:${customerId}`
    const existingData = await getRedisKey(redisKey)

    const paymentSetupData = {
      ...existingData,
      subscriptionId,
      setupCompleted: true,
      subscriptionActive: subscription.status === 'active',
      firstPaymentDate,
      lastPaymentStatus: 'succeeded',
      lastPaymentDate: firstPaymentDate,
      currentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      timestamp: Date.now(),
    }

    await setRedisKey(redisKey, paymentSetupData, 86400)

    // Clear previous failed payments if resolved
    const failedPaymentKey = `failed_payment:${customerId}`
    const failedPaymentData = await getRedisKey(failedPaymentKey)
    if (failedPaymentData) {
      console.log('✅ Resolved previous failed payment:', failedPaymentData)
      await setRedisKey(failedPaymentKey, null, 0) // Clear the failed payment record
    }

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
    const subscription =
      await stripeServerClient.subscriptions.retrieve(subscriptionId)
    const redisKey = `payment_setup:${customerId}`
    const existingData = await getRedisKey(redisKey)
    const bankVerified = existingData?.bankVerified || false

    const invoice = event.data.object as Stripe.Invoice

    const lastPaymentDate = invoice.status_transitions?.finalized_at
      ? new Date(invoice.status_transitions.finalized_at * 1000).toISOString()
      : new Date().toISOString()

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

    // Save failed payment for retry
    const failedPaymentKey = `failed_payment:${customerId}`
    const failedPaymentData = {
      customerId,
      paymentIntentId: invoice.payment_intent,
      amount: invoice.total,
      timestamp: Date.now(),
    }
    await setRedisKey(failedPaymentKey, failedPaymentData, 7 * 86400)

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
      await setRedisKey(redisKey, bankAccountData, 86400)

      // Retry failed payments, if any
      const failedPaymentKey = `failed_payment:${customerId}`
      const failedPaymentData = await getRedisKey(failedPaymentKey)
      if (failedPaymentData) {
        console.log('🔄 Retrying failed payment:', failedPaymentData)
        await retryFailedPayment(failedPaymentData)
      }

      logEvent('Processed Bank Account Attached', event.id, bankAccountData)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Payment Method Attached', event.id, error)
    throw error
  }
}

async function retryFailedPayment(failedPaymentData: any) {
  const { paymentIntentId, amount, customerId } = failedPaymentData

  try {
    console.log('🔄 Retrying payment for PaymentIntent:', paymentIntentId) // Logging it for traceability

    const paymentIntent = await stripeServerClient.paymentIntents.create({
      customer: customerId,
      amount,
      currency: 'usd',
      confirm: true,
    })

    console.log('✅ Payment retried successfully:', paymentIntent.id)
    const redisKey = `failed_payment:${customerId}`
    await setRedisKey(redisKey, null, 0) // Immediate expiration of the failed payment record
  } catch (error) {
    console.error(
      '❌ Failed to retry payment for PaymentIntent:',
      paymentIntentId,
      error instanceof Error ? error.message : String(error)
    )
    throw error
  }
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const customerId = paymentIntent.customer as string
  const amount = paymentIntent.amount
  const metadata = paymentIntent.metadata

  try {
    logEvent('Payment Intent Succeeded', event.id, { customerId, amount })

    const redisKey = `one_time_charge:${paymentIntent.id}`
    const existingChargeData = await getRedisKey(redisKey)

    // If the charge is already marked as 'succeeded', avoid duplicate processing
    if (existingChargeData && existingChargeData.status === 'succeeded') {
      logEvent('Duplicate PaymentIntent Succeeded Event Detected', redisKey, {
        customerId,
        paymentIntentId: paymentIntent.id,
      })
      return NextResponse.json({ received: true })
    }

    // Prepare payment data for Redis
    const paymentData = {
      customerId,
      amount: amount / 100, // Convert to dollars
      chargeType: metadata.chargeType,
      students: metadata.students ? JSON.parse(metadata.students) : [],
      status: 'succeeded',
      timestamp: new Date().toISOString(),
    }

    // Update Redis with succeeded payment status
    await setRedisKey(redisKey, paymentData, 86400) // TTL: 1 day

    logEvent(
      'One-Time Charge Marked as Succeeded in Redis',
      redisKey,
      paymentData
    )

    // Notify the customer (optional)
    // sendEmail(customerId, 'Your payment was successful', paymentData);

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Payment Intent Succeeded', event.id, error)
    logEvent('Error Handling Payment Intent Succeeded', event.id, {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

async function handlePaymentIntentProcessing(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const customerId = paymentIntent.customer as string

  try {
    logEvent('Payment Intent Processing', event.id, { customerId })

    const processingData = {
      customerId,
      amount: paymentIntent.amount / 100,
      status: 'processing',
      timestamp: new Date().toISOString(),
    }

    // Save processing details to Redis or database
    const redisKey = `one_time_charge:${paymentIntent.id}`
    await setRedisKey(redisKey, processingData, 86400)

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Payment Intent Processing', event.id, error)
    throw error
  }
}

async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const customerId = paymentIntent.customer as string
  const lastPaymentError = paymentIntent.last_payment_error?.message

  try {
    logEvent('Payment Intent Failed', event.id, {
      customerId,
      error: lastPaymentError,
    })

    const failedData = {
      customerId,
      amount: paymentIntent.amount / 100,
      status: 'failed',
      error: lastPaymentError || 'Unknown error',
      timestamp: new Date().toISOString(),
    }

    // Save failed payment details to Redis or database
    const redisKey = `one_time_charge:${paymentIntent.id}`
    await setRedisKey(redisKey, failedData, 86400)

    // Notify the customer of the failure
    // sendEmail(customerId, 'Your payment failed', failedData)

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Payment Intent Failed', event.id, error)
    throw error
  }
}

async function handlePaymentIntentCanceled(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const customerId = paymentIntent.customer as string

  try {
    logEvent('Payment Intent Canceled', event.id, { customerId })

    const canceledData = {
      customerId,
      amount: paymentIntent.amount / 100,
      status: 'canceled',
      timestamp: new Date().toISOString(),
    }

    // Save canceled payment details to Redis or database
    const redisKey = `one_time_charge:${paymentIntent.id}`
    await setRedisKey(redisKey, canceledData, 86400)

    // Optionally notify the customer of the cancellation
    // sendEmail(customerId, 'Your payment was canceled', canceledData)

    return NextResponse.json({ received: true })
  } catch (error) {
    handleError('Payment Intent Canceled', event.id, error)
    throw error
  }
}
