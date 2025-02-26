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
  const setupIntent = event.data.object as Stripe.SetupIntent
  console.log('Setup intent succeeded:', {
    id: setupIntent.id,
    customerId: setupIntent.customer,
    paymentMethodId: setupIntent.payment_method,
    timestamp: new Date().toISOString(),
  })

  try {
    // If this is a bank account setup for autopay, mark it in the customer metadata
    if (setupIntent.metadata?.payerDetails) {
      const customerId =
        typeof setupIntent.customer === 'string'
          ? setupIntent.customer
          : setupIntent.customer?.id

      if (customerId) {
        // Log the setup intent success
        logEvent('Setup Intent Succeeded', event.id, {
          eventId: event.id,
          type: event.type,
          status: 'success',
          customerId,
          metadata: {
            setupIntentId: setupIntent.id,
            paymentMethodId:
              typeof setupIntent.payment_method === 'string'
                ? setupIntent.payment_method
                : setupIntent.payment_method?.id || null,
            paymentMethodType:
              setupIntent.payment_method_types?.[0] || 'unknown',
            isForAutopay: 'true',
          },
          timestamp: Date.now(),
        })

        // Update customer metadata
        await stripeServerClient.customers.update(customerId, {
          metadata: {
            bankAccountVerified: 'true',
            bankAccountVerifiedAt: new Date().toISOString(),
            setupIntentId: setupIntent.id,
            paymentMethodId:
              typeof setupIntent.payment_method === 'string'
                ? setupIntent.payment_method
                : setupIntent.payment_method?.id || null,
            enrollmentStatus: 'bank_verified',
          },
        })

        console.log(
          '✅ Updated customer with bank account verification:',
          customerId
        )
      }
    }

    return true
  } catch (error) {
    console.error('❌ Error in handleSetupIntentSucceeded:', error)
    handleError('Setup Intent Succeeded', event.id, error)
    return false
  }
}

export async function handleCustomerCreated(
  event: Stripe.Event
): Promise<boolean> {
  const customer = event.data.object as Stripe.Customer

  console.log('Customer created:', {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    metadata: customer.metadata,
    timestamp: new Date().toISOString(),
  })

  try {
    // Check if this customer already exists in our database
    const existingPayer = await prisma.payer.findFirst({
      where: {
        OR: [
          { email: customer.email ?? undefined },
          { stripeCustomerId: customer.id },
        ],
      },
      include: {
        students: {
          select: {
            id: true,
            name: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (existingPayer) {
      console.log('⚠️ Customer already exists in database:', {
        payerId: existingPayer.id,
        email: existingPayer.email,
        stripeCustomerId: existingPayer.stripeCustomerId,
        studentCount: existingPayer.students.length,
        subscriptionCount: existingPayer.subscriptions.length,
      })

      // If the stripeCustomerId doesn't match, this might be a duplicate
      if (existingPayer.stripeCustomerId !== customer.id) {
        console.log('🚨 Potential duplicate customer detected!', {
          existingStripeId: existingPayer.stripeCustomerId,
          newStripeId: customer.id,
          email: customer.email,
        })

        // Log this event for later cleanup
        logEvent('Duplicate Customer Detected', event.id, {
          eventId: event.id,
          type: event.type,
          status: 'warning',
          customerId: customer.id,
          metadata: {
            existingPayerId: existingPayer.id,
            existingStripeId: existingPayer.stripeCustomerId,
            newStripeId: customer.id,
            email: customer.email,
          },
          timestamp: Date.now(),
        })

        // Update the customer metadata to indicate it's a potential duplicate
        await stripeServerClient.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            potentialDuplicate: 'true',
            duplicateDetectedAt: new Date().toISOString(),
            existingStripeId: existingPayer.stripeCustomerId,
          },
        })
      }
    } else {
      // Check if there are other customers with the same email in Stripe
      if (customer.email) {
        const stripeCustomers = await stripeServerClient.customers.list({
          email: customer.email,
          limit: 5,
        })

        if (stripeCustomers.data.length > 1) {
          const otherCustomers = stripeCustomers.data.filter(
            (c) => c.id !== customer.id
          )
          if (otherCustomers.length > 0) {
            console.log('⚠️ Multiple Stripe customers with same email:', {
              email: customer.email,
              count: stripeCustomers.data.length,
              currentId: customer.id,
              otherIds: otherCustomers.map((c) => c.id),
            })

            // Log this event for later cleanup
            logEvent('Multiple Stripe Customers', event.id, {
              eventId: event.id,
              type: event.type,
              status: 'warning',
              customerId: customer.id,
              metadata: {
                email: customer.email,
                count: stripeCustomers.data.length,
                currentId: customer.id,
                otherIds: otherCustomers.map((c) => c.id).join(','),
              },
              timestamp: Date.now(),
            })
          }
        }
      }
    }

    return true
  } catch (error) {
    console.error('❌ Error in handleCustomerCreated:', error)
    handleError('Customer Created', event.id, error)
    return false
  }
}

export async function handleCustomerUpdated(
  event: Stripe.Event
): Promise<boolean> {
  const customer = event.data.object as Stripe.Customer
  const previousAttributes =
    (event.data.previous_attributes as Partial<Stripe.Customer>) || {}

  console.log('Customer updated:', {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    metadata: customer.metadata,
    previousAttributes: Object.keys(previousAttributes),
    timestamp: new Date().toISOString(),
  })

  try {
    // Check if this customer exists in our database
    const existingPayer = await prisma.payer.findFirst({
      where: { stripeCustomerId: customer.id },
      include: {
        students: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (existingPayer) {
      // Check if email has changed and needs to be updated
      if (customer.email && existingPayer.email !== customer.email) {
        console.log('📧 Customer email changed, updating in database:', {
          oldEmail: existingPayer.email,
          newEmail: customer.email,
        })

        await prisma.payer.update({
          where: { id: existingPayer.id },
          data: {
            email: customer.email,
            name: customer.name || existingPayer.name,
            updatedAt: new Date(),
          },
        })

        // Log email change event
        logEvent('Customer Email Changed', event.id, {
          eventId: event.id,
          type: event.type,
          status: 'info',
          customerId: customer.id,
          metadata: {
            oldEmail: existingPayer.email,
            newEmail: customer.email,
            payerId: existingPayer.id,
          },
          timestamp: Date.now(),
        })
      }

      // Check if metadata has been updated to indicate this is a duplicate
      if (
        customer.metadata?.potentialDuplicate === 'true' &&
        customer.metadata?.duplicateDetectedAt
      ) {
        console.log(
          '🚨 This customer has been marked as a potential duplicate:',
          {
            stripeCustomerId: customer.id,
            email: customer.email,
            duplicateDetectedAt: customer.metadata.duplicateDetectedAt,
            existingStripeId: customer.metadata.existingStripeId,
          }
        )
      }
    } else {
      console.log('⚠️ Customer updated but not found in database:', {
        stripeCustomerId: customer.id,
        email: customer.email,
      })

      // Check if a payer with this email exists but with a different stripeCustomerId
      if (customer.email) {
        const payerWithSameEmail = await prisma.payer.findFirst({
          where: { email: customer.email },
        })

        if (payerWithSameEmail) {
          console.log(
            '🔍 Found payer with same email but different Stripe ID:',
            {
              payerId: payerWithSameEmail.id,
              email: payerWithSameEmail.email,
              stripeCustomerId: payerWithSameEmail.stripeCustomerId,
            }
          )

          // Log this for investigation
          logEvent('Customer ID Mismatch', event.id, {
            eventId: event.id,
            type: event.type,
            status: 'warning',
            customerId: customer.id,
            metadata: {
              payerId: payerWithSameEmail.id,
              payerEmail: payerWithSameEmail.email,
              payerStripeId: payerWithSameEmail.stripeCustomerId,
              updatedStripeId: customer.id,
            },
            timestamp: Date.now(),
          })
        }
      }
    }

    return true
  } catch (error) {
    console.error('❌ Error in handleCustomerUpdated:', error)
    handleError('Customer Updated', event.id, error)
    return false
  }
}

export async function handlePaymentIntentSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  console.log('Payment intent succeeded:', event.id)

  // Check if this is an ACH payment
  if (paymentIntent.payment_method_types.includes('us_bank_account')) {
    console.log('✅ ACH payment succeeded:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      customerId: paymentIntent.customer,
      status: paymentIntent.status,
    })

    // Import and use the ACH-specific handler from our sync service
    const { handleACHPaymentIntent } = await import(
      '@/lib/services/stripe-sync'
    )
    await handleACHPaymentIntent(event)
  }

  return true
}

export async function handlePaymentIntentProcessing(
  event: Stripe.Event
): Promise<boolean> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  console.log('Payment intent processing:', event.id)

  // Check if this is an ACH payment
  if (paymentIntent.payment_method_types.includes('us_bank_account')) {
    console.log('⏳ ACH payment processing:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      customerId: paymentIntent.customer,
      status: paymentIntent.status,
    })

    // Import and use the ACH-specific handler from our sync service
    const { handleACHPaymentIntent } = await import(
      '@/lib/services/stripe-sync'
    )
    await handleACHPaymentIntent(event)
  }

  return true
}

export async function handleChargeSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  const charge = event.data.object as Stripe.Charge

  console.log('Charge succeeded:', {
    id: charge.id,
    amount: charge.amount / 100,
    currency: charge.currency,
    customerId: charge.customer,
    paymentIntentId: charge.payment_intent,
    metadata: charge.metadata,
  })

  try {
    // If this charge is related to a subscription, we can log additional details
    if (charge.invoice) {
      const invoice = await stripeServerClient.invoices.retrieve(
        charge.invoice as string
      )

      console.log('Charge related to invoice:', {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        billingReason: invoice.billing_reason,
        total: invoice.total / 100,
      })
    }

    // Log the successful charge event
    logEvent('Charge Succeeded', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'success',
      customerId:
        typeof charge.customer === 'string'
          ? charge.customer
          : charge.customer?.id,
      metadata: {
        chargeId: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        paymentMethod: charge.payment_method_details?.type || 'unknown',
        invoiceId: charge.invoice as string,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error('❌ Error in handleChargeSucceeded:', error)
    handleError('Charge Succeeded', event.id, error)
    return false
  }
}

export async function handleChargeFailed(
  event: Stripe.Event
): Promise<boolean> {
  const charge = event.data.object as Stripe.Charge

  console.log('Charge failed:', {
    id: charge.id,
    amount: charge.amount / 100,
    currency: charge.currency,
    customerId: charge.customer,
    paymentIntentId: charge.payment_intent,
    failureCode: charge.failure_code,
    failureMessage: charge.failure_message,
    metadata: charge.metadata,
  })

  try {
    // Log the failed charge event
    logEvent('Charge Failed', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'error',
      customerId:
        typeof charge.customer === 'string'
          ? charge.customer
          : charge.customer?.id,
      metadata: {
        chargeId: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        failureCode: charge.failure_code || 'unknown',
        failureMessage: charge.failure_message || 'No failure message provided',
        paymentMethod: charge.payment_method_details?.type || 'unknown',
        invoiceId: charge.invoice as string,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error('❌ Error in handleChargeFailed:', error)
    handleError('Charge Failed', event.id, error)
    return false
  }
}

export async function handleChargePending(
  event: Stripe.Event
): Promise<boolean> {
  const charge = event.data.object as Stripe.Charge

  console.log('Charge pending:', {
    id: charge.id,
    amount: charge.amount / 100,
    currency: charge.currency,
    customerId: charge.customer,
    paymentIntentId: charge.payment_intent,
    metadata: charge.metadata,
  })

  try {
    // Log the pending charge event
    logEvent('Charge Pending', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'pending',
      customerId:
        typeof charge.customer === 'string'
          ? charge.customer
          : charge.customer?.id,
      metadata: {
        chargeId: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        paymentMethod: charge.payment_method_details?.type || 'unknown',
        invoiceId: charge.invoice as string,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error('❌ Error in handleChargePending:', error)
    handleError('Charge Pending', event.id, error)
    return false
  }
}

export async function handleInvoiceCreated(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice

  console.log('Invoice created:', {
    id: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    total: invoice.total / 100,
    currency: invoice.currency,
    status: invoice.status,
    metadata: invoice.metadata,
  })

  try {
    // Log the invoice created event
    logEvent('Invoice Created', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'info',
      customerId:
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id,
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        total: invoice.total / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        dueDate: invoice.due_date
          ? new Date(invoice.due_date * 1000).toISOString()
          : undefined,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error('❌ Error in handleInvoiceCreated:', error)
    handleError('Invoice Created', event.id, error)
    return false
  }
}

export async function handleInvoiceFinalized(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice

  console.log('Invoice finalized:', {
    id: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    total: invoice.total / 100,
    currency: invoice.currency,
    status: invoice.status,
    metadata: invoice.metadata,
  })

  try {
    // Log the invoice finalized event
    logEvent('Invoice Finalized', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'info',
      customerId:
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id,
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        total: invoice.total / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        dueDate: invoice.due_date
          ? new Date(invoice.due_date * 1000).toISOString()
          : undefined,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error('❌ Error in handleInvoiceFinalized:', error)
    handleError('Invoice Finalized', event.id, error)
    return false
  }
}

export async function handleInvoicePaid(event: Stripe.Event): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice

  console.log('Invoice paid:', {
    id: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    total: invoice.total / 100,
    currency: invoice.currency,
    status: invoice.status,
    metadata: invoice.metadata,
  })

  try {
    // If this is a subscription invoice, we may want to update our database
    if (invoice.subscription) {
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id

      if (customerId) {
        // Find the payer in our database
        const payer = await prisma.payer.findUnique({
          where: { stripeCustomerId: customerId },
          include: {
            students: true,
            subscriptions: {
              where: { stripeSubscriptionId: invoice.subscription as string },
            },
          },
        })

        if (payer) {
          console.log('Found payer for paid invoice:', {
            payerId: payer.id,
            studentCount: payer.students.length,
            subscriptionCount: payer.subscriptions.length,
          })

          // Update subscription payment dates if found
          if (payer.subscriptions.length > 0) {
            const subscription = payer.subscriptions[0]
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                lastPaymentDate: new Date(),
                status: SubscriptionStatus.ACTIVE,
              },
            })

            console.log('Updated subscription payment date:', {
              subscriptionId: subscription.id,
              lastPaymentDate: new Date().toISOString(),
            })
          }

          // Update student payment dates
          if (payer.students.length > 0) {
            await prisma.student.updateMany({
              where: { payerId: payer.id },
              data: {
                lastPaymentDate: new Date(),
                status: StudentStatus.ENROLLED,
              },
            })

            console.log('Updated student payment dates:', {
              studentCount: payer.students.length,
              lastPaymentDate: new Date().toISOString(),
            })
          }
        }
      }
    }

    // Log the invoice paid event
    logEvent('Invoice Paid', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'success',
      customerId:
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id,
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        total: invoice.total / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        paymentIntent: invoice.payment_intent as string,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error('❌ Error in handleInvoicePaid:', error)
    handleError('Invoice Paid', event.id, error)
    return false
  }
}

export async function handleInvoiceUpdated(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice

  console.log('Invoice updated:', {
    id: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.subscription,
    total: invoice.total / 100,
    currency: invoice.currency,
    status: invoice.status,
    metadata: invoice.metadata,
  })

  try {
    // Log the invoice updated event
    logEvent('Invoice Updated', event.id, {
      eventId: event.id,
      type: event.type,
      status: 'info',
      customerId:
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id,
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription as string,
        total: invoice.total / 100,
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
      },
      timestamp: Date.now(),
    })

    return true
  } catch (error) {
    console.error('❌ Error in handleInvoiceUpdated:', error)
    handleError('Invoice Updated', event.id, error)
    return false
  }
}
