import { SubscriptionStatus } from '@prisma/client'
import { type Stripe } from 'stripe'

import { prisma } from '@/lib/db'

import { type LogEventData } from './types'
import { logEvent, handleError } from './utils'

// Subscription Handlers
export async function handleSubscriptionCreated(
  event: Stripe.Event
): Promise<boolean> {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  try {
    // Check for existing subscription record first
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    })

    if (existingSubscription) {
      console.log('Subscription record already exists:', {
        stripeSubscriptionId: subscription.id,
        timestamp: new Date().toISOString(),
      })
      return true // Exit early as this is a duplicate webhook
    }

    // 1. Find payor by stripeCustomerId
    const payor = await prisma.payor.findFirst({
      where: { stripeCustomerId: customerId },
    })

    if (!payor) {
      throw new Error(`No payor found for Stripe customer: ${customerId}`)
    }

    // 2. Extract student info from subscription items
    const students = subscription.items.data.map((item) => ({
      name: item.metadata.studentName,
      rate: Number(item.metadata.monthlyRate),
    }))

    // 3. Create subscription record with INCOMPLETE status
    await prisma.subscription.create({
      data: {
        stripeSubscriptionId: subscription.id,
        payorId: payor.id,
        status: SubscriptionStatus.INCOMPLETE,
        amount: subscription.items.data.reduce(
          (sum, item) => sum + (Number(item.metadata.monthlyRate) || 0),
          0
        ),
        currency: 'usd',
        billingCycleStart: new Date(subscription.current_period_start * 1000),
        billingCycleEnd: new Date(subscription.current_period_end * 1000),
        description: `Tuition Plan: ${students
          .map((s) => `${s.name} ($${s.rate}/mo)`)
          .join(', ')}`,
      },
    })

    // Log successful subscription record creation
    logEvent('Subscription Record Created', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'success',
      customerId,
      subscriptionId: subscription.id,
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    handleError('Subscription Created', event.id, error)
    throw error
  }
}

export async function handleSubscriptionUpdated(
  event: Stripe.Event
): Promise<boolean> {
  const subscription = event.data.object as Stripe.Subscription
  const subscriptionId = subscription.id

  try {
    // 1. Find the subscription in your database
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (!existingSubscription) {
      throw new Error(`Subscription not found for ID: ${subscriptionId}`)
    }

    // 2. Update the subscription in your database
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        billingCycleStart: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : null,
        billingCycleEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
      },
    })

    // 3. Optional: Log the update
    logEvent('Subscription Updated', event.id, {
      eventId: event.id,
      type: event.type,
      subscriptionId,
      status: subscription.status.toUpperCase() as SubscriptionStatus,
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    handleError('Subscription Updated', event.id, error)
    throw error
  }
}

export async function handleSubscriptionDeleted(
  event: Stripe.Event
): Promise<boolean> {
  const subscription = event.data.object as Stripe.Subscription
  const subscriptionId = subscription.id

  try {
    // Find the subscription in your database
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (!existingSubscription) {
      throw new Error(
        `No subscription found for Stripe subscription: ${subscriptionId}`
      )
    }

    // Mark the subscription as canceled
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(), // Use the current timestamp for cancellation
      },
    })

    logEvent('Subscription Deleted', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'canceled',
      subscriptionId,
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    handleError('Subscription Deleted', event.id, error)
    throw error
  }
}

export async function handleInvoicePaymentSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string
  const paymentIntentId = invoice.payment_intent as string
  const totalAmount = invoice.total / 100 // Stripe sends amounts in cents
  const currency = invoice.currency

  try {
    // 1. Find the subscription in your database
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (!subscription) {
      throw new Error(
        `No subscription found for Stripe subscription: ${subscriptionId}`
      )
    }

    // Only update if not already active
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      // 2. Update subscription status to ACTIVE
      const billingCycleStart = invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : null
      const billingCycleEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null

      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          billingCycleStart,
          billingCycleEnd,
        },
      })
    }

    // 3. Create a payment record
    const paymentRecord = await prisma.payment.create({
      data: {
        stripePaymentId: paymentIntentId,
        payorId: subscription.payorId,
        amount: totalAmount,
        currency,
        status: PaymentStatus.SUCCEEDED, // Use enum for consistency
      },
    })

    // 4. (Optional) Notify the user about successful payment
    // Example:
    // await sendPaymentSuccessNotification({
    //   payorId: subscription.payorId,
    //   amount: totalAmount,
    //   currency,
    // })

    // 5. Log the successful handling
    const paymentData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'succeeded',
      customerId: subscription.payorId,
      subscriptionId,
      amount: totalAmount,
      metadata: {
        paymentRecordId: paymentRecord.id,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null,
        subscriptionStatus: subscription.status,
      },
      timestamp: Date.now(),
    }

    logEvent('Invoice Payment Succeeded', event.id, paymentData)

    return true
  } catch (error) {
    // Log and handle the error
    handleError('Invoice Payment Succeeded', event.id, error)
    throw error
  }
}

export enum PaymentStatus {
  SUCCEEDED = 'succeeded', // Payment completed successfully
  PENDING = 'pending', // Payment is awaiting confirmation
  FAILED = 'failed', // Payment failed (e.g., insufficient funds)
  CANCELED = 'canceled', // Payment was canceled
  PROCESSING = 'processing', // Payment is still being processed
  REQUIRES_ACTION = 'requires_action', // Payment requires additional action (e.g., 3D Secure)
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method', // Failed payment, needs a new payment method
  REFUNDED = 'refunded', // Payment was refunded fully
  PARTIALLY_REFUNDED = 'partially_refunded', // Payment was partially refunded
}

export async function handleInvoicePaymentFailed(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string
  const paymentIntentId = invoice.payment_intent as string | null
  const totalAmount = invoice.total / 100 // Stripe sends amounts in cents
  const currency = invoice.currency

  try {
    // 1. Find the subscription in your database
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    })

    if (!subscription) {
      throw new Error(
        `No subscription found for Stripe subscription: ${subscriptionId}`
      )
    }

    // 2. Update subscription status to PAST_DUE
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    })

    // 3. Create a payment record with FAILED status
    if (paymentIntentId) {
      await prisma.payment.create({
        data: {
          stripePaymentId: paymentIntentId,
          payorId: subscription.payorId,
          amount: totalAmount,
          currency,
          status: PaymentStatus.FAILED, // Use the enum for failed payments
        },
      })
    }

    // 4. (Optional) Notify the user about the failed payment
    // Example:
    // await sendPaymentFailureNotification({
    //   payorId: subscription.payorId,
    //   amount: totalAmount,
    //   currency,
    //   nextPaymentAttempt: invoice.next_payment_attempt,
    // })

    // 5. Log the failure event for debugging
    const failureData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'failed',
      customerId: subscription.payorId,
      subscriptionId,
      amount: totalAmount,
      metadata: {
        nextPaymentAttempt: invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null,
      },
      timestamp: Date.now(),
    }

    logEvent('Invoice Payment Failed', event.id, failureData)
    return true
  } catch (error) {
    // Log and handle the error
    handleError('Invoice Payment Failed', event.id, error)
    throw error
  }
}

export async function handlePaymentIntentFailed(
  event: Stripe.Event
): Promise<boolean> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const paymentIntentId = paymentIntent.id
  const customerId = paymentIntent.customer as string
  const amount = paymentIntent.amount / 100 // Stripe sends amounts in cents
  const currency = paymentIntent.currency
  const lastError = paymentIntent.last_payment_error?.message || 'Unknown error'

  try {
    // Find Payor by customerId
    const payor = await prisma.payor.findFirst({
      where: { stripeCustomerId: customerId },
    })

    if (!payor) {
      throw new Error(`No payor found for Stripe customer: ${customerId}`)
    }

    // Log the payment failure in the Payment table
    await prisma.payment.create({
      data: {
        stripePaymentId: paymentIntentId,
        payorId: payor.id,
        amount,
        currency,
        status: PaymentStatus.FAILED,
      },
    })

    // Optional: Notify the user about the failure
    // Example:
    // await sendPaymentFailureNotification(payor.email, lastError)

    logEvent('Payment Intent Failed', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'failed',
      customerId,
      metadata: {
        paymentIntentId,
        errorMessage: lastError,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    handleError('Payment Intent Failed', event.id, error)
    throw error
  }
}

// Event Handlers Map
export const eventHandlers: Record<
  string,
  (event: Stripe.Event) => Promise<boolean>
> = {
  // 'setup_intent.succeeded': handleSetupIntentSucceeded,
  // 'setup_intent.requires_action': handleSetupIntentRequiresAction,
  // 'invoice.created': handleInvoiceCreated,
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  // 'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
} as const
