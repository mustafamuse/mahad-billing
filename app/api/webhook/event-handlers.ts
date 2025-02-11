import { SubscriptionStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { Stripe } from 'stripe'

import { PAYMENT_RULES, getGracePeriodEnd } from '@/lib/config/payment-rules'
import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'
import { StudentStatus } from '@/lib/types/student'
import { logEvent, handleError } from '@/lib/utils'

// Define the supported event types
type SupportedEventTypes =
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'payment_intent.payment_failed'
  | 'setup_intent.succeeded'
  | 'customer.created'
  | 'customer.updated'
  | 'payment_intent.succeeded'
  | 'payment_intent.processing'
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.pending'
  | 'invoice.created'
  | 'invoice.finalized'
  | 'invoice.paid'
  | 'invoice.updated'

// Type for the event handlers
type EventHandler = (event: Stripe.Event) => Promise<boolean>

// Map of event types to their handlers
export const eventHandlers: Record<SupportedEventTypes, EventHandler> = {
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'setup_intent.succeeded': handleSetupIntentSucceeded,
  'customer.created': handleCustomerCreated,
  'customer.updated': handleCustomerUpdated,
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.processing': handlePaymentIntentProcessing,
  'charge.succeeded': handleChargeSucceeded,
  'charge.failed': handleChargeFailed,
  'charge.pending': handleChargePending,
  'invoice.created': handleInvoiceCreated,
  'invoice.finalized': handleInvoiceFinalized,
  'invoice.paid': handleInvoicePaid,
  'invoice.updated': handleInvoiceUpdated,
}

// Subscription Handlers
export async function handleSubscriptionCreated(
  event: Stripe.Event
): Promise<boolean> {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  console.log('📅 Subscription Created - Date Info:', {
    billingCycleAnchor: new Date(subscription.billing_cycle_anchor * 1000),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    created: new Date(subscription.created * 1000),
  })

  try {
    // Check for existing subscription record first
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    if (existingSubscription) {
      console.log('Subscription record already exists:', {
        stripeSubscriptionId: subscription.id,
        timestamp: new Date().toISOString(),
      })
      return true
    }

    // Find payer by stripeCustomerId with students
    const payer = await prisma.payer.findFirst({
      where: { stripeCustomerId: customerId },
      include: {
        students: true,
        subscriptions: true,
      },
    })

    if (!payer) {
      throw new Error(`No payer found for Stripe customer: ${customerId}`)
    }

    // Create subscription record with improved date handling
    const subscriptionData = {
      stripeSubscriptionId: subscription.id,
      payerId: payer.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      lastPaymentDate: new Date(),
      // Use billing_cycle_anchor for more accurate next payment date
      nextPaymentDate: new Date(subscription.billing_cycle_anchor * 1000),
      paymentRetryCount: 0,
      lastPaymentError: null,
      gracePeriodEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days grace period,
    }

    await prisma.$transaction(async (tx) => {
      // Create subscription
      await tx.subscription.create({
        data: subscriptionData,
      })

      // Update student statuses to enrolled
      for (const student of payer.students) {
        await tx.student.update({
          where: { id: student.id },
          data: { status: StudentStatus.ENROLLED },
        })
      }
    })

    logEvent('Subscription Record Created', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'success',
      customerId,
      subscriptionId: subscription.id,
      timestamp: Date.now(),
    })

    console.log(
      `✅ Subscription ${subscription.id} created and updated in database`
    )
    return true
  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
    handleError('Subscription Created', event.id, error)
    return false
  }
}

export async function handleSubscriptionUpdated(
  event: Stripe.Event
): Promise<boolean> {
  const subscription = event.data.object as Stripe.Subscription
  const subscriptionId = subscription.id

  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    if (!existingSubscription) {
      throw new Error(`Subscription not found for ID: ${subscriptionId}`)
    }

    const newStatus = subscription.status.toUpperCase() as SubscriptionStatus
    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : null
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null

    await prisma.$transaction(async (tx) => {
      // Update subscription
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: newStatus,
          currentPeriodStart,
          currentPeriodEnd,
          nextPaymentDate: new Date(subscription.billing_cycle_anchor * 1000),
          gracePeriodEndsAt:
            newStatus === SubscriptionStatus.PAST_DUE
              ? new Date(Date.now() + 259200000)
              : null,
        },
      })

      // Update student statuses if subscription is no longer active
      if (newStatus !== SubscriptionStatus.ACTIVE) {
        for (const student of existingSubscription.payer.students) {
          await tx.student.update({
            where: { id: student.id },
            data: {
              status:
                newStatus === SubscriptionStatus.CANCELED
                  ? StudentStatus.WITHDRAWN
                  : StudentStatus.ENROLLED,
            },
          })
        }
      }
    })

    logEvent('Subscription Updated', event.id, {
      eventId: event.id,
      type: event.type,
      subscriptionId,
      status: newStatus,
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
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    if (!existingSubscription) {
      throw new Error(
        `No subscription found for Stripe subscription: ${subscriptionId}`
      )
    }

    let latestInvoice = subscription.latest_invoice

    // Fetch full Invoice if it's a string (ID)
    if (typeof latestInvoice === 'string') {
      try {
        latestInvoice =
          await stripeServerClient.invoices.retrieve(latestInvoice)
      } catch (error) {
        console.error('❌ Failed to fetch Invoice:', error)
      }
    }

    // Determine lastPaymentError with proper checks
    let lastPaymentError = 'Subscription canceled'

    // Use Stripe's cancellation reason if available
    if (subscription.cancellation_details?.reason) {
      lastPaymentError = subscription.cancellation_details.reason
    }

    // If the latest invoice was finalized but the subscription is canceled, it likely failed due to ACH
    if (
      latestInvoice &&
      typeof latestInvoice !== 'string' &&
      latestInvoice.status_transitions?.finalized_at
    ) {
      lastPaymentError = 'ACH payment failed before finalization'
    }

    await prisma.$transaction(async (tx) => {
      // Mark subscription as canceled
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELED,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          gracePeriodEndsAt: null,
          lastPaymentError,
          paymentRetryCount: 0,
        },
      })

      // Update student statuses to inactive
      for (const student of existingSubscription.payer.students) {
        await tx.student.update({
          where: { id: student.id },
          data: { status: 'inactive' },
        })
      }
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

  console.log('📅 Invoice Payment Succeeded - Date Info:', {
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : null,
    periodStart: new Date(invoice.period_start * 1000),
    periodEnd: new Date(invoice.period_end * 1000),
    nextPaymentAttempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000)
      : null,
  })

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: {
        payer: {
          include: { students: true },
        },
      },
    })

    if (!subscription) {
      throw new Error(`No subscription found: ${subscriptionId}`)
    }

    // Fetch the latest subscription data from Stripe
    const stripeSubscription =
      await stripeServerClient.subscriptions.retrieve(subscriptionId)

    let paymentIntent = invoice.payment_intent

    if (typeof paymentIntent === 'string') {
      try {
        paymentIntent =
          await stripeServerClient.paymentIntents.retrieve(paymentIntent)
      } catch (error) {
        console.error('❌ Failed to fetch PaymentIntent:', error)
      }
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update subscription
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          lastPaymentDate: invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : new Date(),
          currentPeriodStart: new Date(
            stripeSubscription.current_period_start * 1000
          ),
          currentPeriodEnd: new Date(
            stripeSubscription.current_period_end * 1000
          ),
          nextPaymentDate: new Date(
            stripeSubscription.billing_cycle_anchor * 1000
          ),
          paymentRetryCount: 0,
          lastPaymentError: null,
          gracePeriodEndsAt:
            paymentIntent &&
            typeof paymentIntent !== 'string' &&
            paymentIntent.status === 'succeeded' &&
            paymentIntent.payment_method_types?.[0] !== 'ach_debit' // Only clear if NOT ACH
              ? null
              : subscription.gracePeriodEndsAt,
        },
      })

      // Reset student statuses if needed
      for (const student of subscription.payer.students) {
        if (student.status === PAYMENT_RULES.STATUS_UPDATES.PAYMENT_FAILED) {
          await tx.student.update({
            where: { id: student.id },
            data: { status: PAYMENT_RULES.STATUS_UPDATES.PAYMENT_SUCCEEDED },
          })
        }
      }
    })

    logEvent('Invoice Payment Succeeded', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'succeeded',
      customerId: subscription.payerId,
      subscriptionId,
      timestamp: Date.now(),
    })

    console.log(
      `✅ Subscription ${subscriptionId} payment recorded successfully`
    )
    return true
  } catch (error) {
    console.error('❌ Error in handleInvoicePaymentSucceeded:', error)
    handleError('Invoice Payment Succeeded', event.id, error)
    return false
  }
}

export async function handleInvoicePaymentFailed(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    if (!subscription) {
      throw new Error(`No subscription found: ${subscriptionId}`)
    }

    let paymentIntent = invoice.payment_intent
    let charge = invoice.charge

    // Fetch full PaymentIntent if it's a string
    if (typeof paymentIntent === 'string') {
      try {
        paymentIntent =
          await stripeServerClient.paymentIntents.retrieve(paymentIntent)
      } catch (error) {
        console.error('❌ Failed to fetch PaymentIntent:', error)
      }
    }

    // Fetch full Charge if it's a string
    if (typeof charge === 'string') {
      try {
        charge = await stripeServerClient.charges.retrieve(charge)
      } catch (error) {
        console.error('❌ Failed to fetch Charge:', error)
      }
    }

    // Extract error message safely
    const lastPaymentError =
      (paymentIntent &&
        typeof paymentIntent !== 'string' &&
        paymentIntent.last_payment_error?.message) ||
      (charge && typeof charge !== 'string' && charge.failure_message) ||
      (charge && typeof charge !== 'string' && charge.outcome?.reason) ||
      'ACH payment failed'

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update subscription status
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
          paymentRetryCount: {
            increment: 1,
          },
          lastPaymentError,
          gracePeriodEndsAt: getGracePeriodEnd(new Date()),
        },
      })

      // Update student statuses if needed
      if (subscription.paymentRetryCount >= PAYMENT_RULES.RETRY.MAX_ATTEMPTS) {
        for (const student of subscription.payer.students) {
          await tx.student.update({
            where: { id: student.id },
            data: { status: PAYMENT_RULES.STATUS_UPDATES.PAYMENT_FAILED },
          })
        }
      }
    })

    // Log for internal tracking
    logEvent('Invoice Payment Failed', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'failed',
      customerId: subscription.payerId,
      subscriptionId,
      retryCount: subscription.paymentRetryCount + 1,
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    handleError('Invoice Payment Failed', event.id, error)
    throw error
  }
}

export async function handlePaymentIntentFailed(
  event: Stripe.Event
): Promise<boolean> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const amount = paymentIntent.amount // Already in cents
  const currency = paymentIntent.currency
  const errorMessage =
    paymentIntent.last_payment_error?.message || 'Unknown error'
  const metadata = paymentIntent.metadata || {}

  try {
    const payer = await prisma.payer.findFirst({
      where: {
        stripeCustomerId:
          typeof paymentIntent.customer === 'string'
            ? paymentIntent.customer
            : undefined,
      },
      include: {
        subscriptions: {
          where: {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
            },
          },
        },
      },
    })

    if (!payer) {
      throw new Error(
        `No payer found for Stripe customer: ${paymentIntent.customer}`
      )
    }

    // If this is related to a subscription payment
    if (metadata.subscriptionId) {
      const subscription = payer.subscriptions.find(
        (s) => s.stripeSubscriptionId === metadata.subscriptionId
      )

      if (subscription) {
        console.log('Payment failed:', {
          subscriptionId: subscription.id,
          stripePaymentId: paymentIntent.id,
          amount,
          currency,
          status: 'failed',
          errorMessage,
          retryCount: subscription.paymentRetryCount,
        })
      }
    }

    logEvent('Payment Intent Failed', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'failed',
      customerId:
        typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : undefined,
      metadata: {
        paymentIntentId: paymentIntent.id,
        errorMessage,
        subscriptionId: metadata.subscriptionId,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    handleError('Payment Intent Failed', event.id, error)
    throw error
  }
}

export async function handleSubscriptionCanceled(
  event: Stripe.Event
): Promise<boolean> {
  const subscription = event.data.object as Stripe.Subscription

  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    if (!existingSubscription) {
      throw new Error(`No subscription found: ${subscription.id}`)
    }

    await prisma.$transaction(async (tx) => {
      // Update subscription status
      await tx.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          gracePeriodEndsAt: null,
          lastPaymentError:
            subscription.cancellation_details?.reason ||
            'Subscription canceled',
          paymentRetryCount: 0,
        },
      })

      // Update student statuses to withdrawn
      await tx.student.updateMany({
        where: {
          payerId: existingSubscription.payerId,
        },
        data: {
          status: StudentStatus.WITHDRAWN,
        },
      })
    })

    logEvent('Subscription Canceled', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'canceled',
      customerId: existingSubscription.payerId,
      subscriptionId: subscription.id,
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    handleError('Subscription Canceled', event.id, error)
    throw error
  }
}

// Helper function for support/admin tasks
export async function getStripeSubscriptionDetails(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription?.stripeSubscriptionId) {
    throw new Error('Stripe subscription ID not found')
  }

  return `https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`
}

// Add basic handlers for new events
export async function handleSetupIntentSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Setup intent succeeded:', event.id)
  return true
}

export async function handleCustomerCreated(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Customer created:', event.id)
  return true
}

export async function handleCustomerUpdated(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Customer updated:', event.id)
  return true
}

export async function handlePaymentIntentSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Payment intent succeeded:', event.id)
  return true
}

export async function handlePaymentIntentProcessing(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Payment intent processing:', event.id)
  return true
}

export async function handleChargeSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Charge succeeded:', event.id)
  return true
}

export async function handleChargeFailed(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Charge failed:', event.id)
  return true
}

export async function handleChargePending(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Charge pending:', event.id)
  return true
}

export async function handleInvoiceCreated(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Invoice created:', event.id)
  return true
}

export async function handleInvoiceFinalized(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Invoice finalized:', event.id)
  return true
}

export async function handleInvoicePaid(event: Stripe.Event): Promise<boolean> {
  console.log('Invoice paid:', event.id)
  return true
}

export async function handleInvoiceUpdated(
  event: Stripe.Event
): Promise<boolean> {
  console.log('Invoice updated:', event.id)
  return true
}
