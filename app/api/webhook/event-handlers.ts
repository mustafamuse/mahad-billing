import { Stripe } from 'stripe'

import { redis } from '@/lib/redis'
import { stripeServerClient } from '@/lib/utils/stripe'

import { CONFIG } from './config'
import {
  getPaymentStatusKey,
  getSetupVerificationKey,
  getSubscriptionStatusKey,
  getSetupIntentMetadataKey,
  getWebhookSubscriptionStatusKey,
} from './redis-utils'
import { LogEventData, SubscriptionStatus, VerificationData } from './types'
import { logEvent, handleError } from './utils'

function generateVerificationData(
  event: Stripe.Event,
  setupIntent: Stripe.SetupIntent,
  paymentMethod: Stripe.PaymentMethod,
  metadata: any
): LogEventData {
  return {
    eventId: event.id,
    type: event.type,
    status: 'succeeded',
    setupIntentId: setupIntent.id,
    customerId: setupIntent.customer as string,
    paymentMethodId: setupIntent.payment_method as string,
    bankName: paymentMethod.us_bank_account?.bank_name || undefined,
    last4: paymentMethod.us_bank_account?.last4 || undefined,
    studentKey: metadata.studentKey,
    total: metadata.total,
    subscriptionStatus: {
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    metadata: {
      ...setupIntent.metadata,
      verifiedAt: Date.now(),
    },
    timestamp: Date.now(),
  }
}

// Setup Intent Handlers
export async function handleSetupIntentSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  const setupIntent = event.data.object as Stripe.SetupIntent
  const customerId = setupIntent.customer as string

  if (!customerId) {
    const missingCustomerLogData: LogEventData = {
      eventId: event.id,
      type: event.type,
      message: 'Missing customer ID',
      setupIntentId: setupIntent.id,
      timestamp: Date.now(),
    }
    logEvent('Missing customer ID', event.id, missingCustomerLogData)
    return false
  }

  try {
    // Retrieve payment method details
    const paymentMethod = await stripeServerClient.paymentMethods.retrieve(
      setupIntent.payment_method as string
    )

    // Validate bank account details
    if (!paymentMethod.us_bank_account) {
      const errorData: LogEventData = {
        eventId: event.id,
        type: event.type,
        message: 'Missing bank account details',
        setupIntentId: setupIntent.id,
        paymentMethodId: setupIntent.payment_method as string,
        timestamp: Date.now(),
      }
      logEvent('Missing bank account details', event.id, errorData)
      throw new Error(
        `Missing bank account details for payment method: ${setupIntent.payment_method}`
      )
    }

    // Retrieve setup intent metadata
    const setupIntentMetadataKey = getSetupIntentMetadataKey(customerId)
    const metadataFromRedis = await redis.get(setupIntentMetadataKey)

    if (!metadataFromRedis) {
      const errorData: LogEventData = {
        eventId: event.id,
        type: event.type,
        message: 'Setup intent metadata missing',
        setupIntentId: setupIntent.id,
        customerId,
        timestamp: Date.now(),
      }
      logEvent('Setup intent metadata missing', event.id, errorData)
      throw new Error(
        `Setup intent metadata is missing for customerId: ${customerId}, setupIntentId: ${setupIntent.id}`
      )
    }

    // Parse metadata with error handling
    let metadata: any
    try {
      metadata = JSON.parse(metadataFromRedis as string)
    } catch (error) {
      const errorData: LogEventData = {
        eventId: event.id,
        type: event.type,
        message: 'Error parsing metadata from Redis',
        setupIntentId: setupIntent.id,
        customerId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      }
      logEvent('Error parsing metadata from Redis', event.id, errorData)
      throw new Error(
        String(
          `Failed to parse metadata for setupIntentId: ${setupIntent.id}, customerId: ${customerId}`
        )
      )
    }

    // Validate required metadata fields
    if (!metadata.studentKey || !metadata.total) {
      const errorData: LogEventData = {
        eventId: event.id,
        type: event.type,
        message: 'Missing required metadata fields',
        setupIntentId: setupIntent.id,
        customerId,
        metadata,
        timestamp: Date.now(),
      }
      logEvent('Missing required metadata fields', event.id, errorData)
      throw new Error(
        `Missing required metadata fields for setupIntentId: ${setupIntent.id}`
      )
    }

    // Generate verification data
    const verificationData = generateVerificationData(
      event,
      setupIntent,
      paymentMethod,
      metadata
    )

    // Store verification data and subscription status in parallel
    const verificationKey = getSetupVerificationKey(setupIntent.id)
    const subscriptionStatusKey = getWebhookSubscriptionStatusKey(
      setupIntent.id
    )

    await Promise.all([
      redis.set(verificationKey, JSON.stringify(verificationData), {
        ex: CONFIG.TTL.SETUP_VERIFICATION,
      }),
      redis.set(
        subscriptionStatusKey,
        JSON.stringify({
          setupIntentId: setupIntent.id,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        {
          ex: CONFIG.TTL.SUBSCRIPTION_STATUS,
        }
      ),
    ])

    logEvent('Setup Intent Succeeded', event.id, verificationData)
    return true
  } catch (error) {
    handleError('Setup Intent Succeeded', event.id, error)
    throw error
  }
}

export async function handleSetupIntentRequiresAction(
  event: Stripe.Event
): Promise<boolean> {
  const setupIntent = event.data.object as Stripe.SetupIntent
  const customerId = setupIntent.customer as string

  try {
    const verificationData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'requires_action',
      customerId,
      error: setupIntent.last_setup_error?.message,
      timestamp: Date.now(),
    }

    const verificationKey = getSetupVerificationKey(setupIntent.id)
    await redis.set(verificationKey, JSON.stringify(verificationData), {
      ex: CONFIG.TTL.SETUP_VERIFICATION,
    })

    logEvent('Setup Intent Requires Action', event.id, verificationData)
    return true
  } catch (error) {
    handleError('Setup Intent Requires Action', event.id, error)
    throw error
  }
}

// Invoice Handlers
export async function handleInvoiceCreated(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string

  try {
    const logData: LogEventData = {
      eventId: event.id,
      type: event.type,
      customerId,
      amount: invoice.total,
      status: invoice.status || 'unknown',
      timestamp: Date.now(),
    }
    logEvent('Invoice Created', event.id, logData)
    return true
  } catch (error) {
    handleError('Invoice Created', event.id, error)
    throw error
  }
}

export async function handleInvoicePaymentSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  try {
    const subscription =
      await stripeServerClient.subscriptions.retrieve(subscriptionId)

    const paymentData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'succeeded',
      customerId,
      subscriptionId,
      amount: invoice.total,
      metadata: {
        paidAt: invoice.status_transitions?.paid_at,
        nextPaymentAttempt: invoice.next_payment_attempt,
        subscriptionStatus: subscription.status,
      },
      timestamp: Date.now(),
    }

    const paymentKey = getPaymentStatusKey(invoice.id)
    await redis.set(paymentKey, JSON.stringify(paymentData), {
      ex: CONFIG.TTL.PAYMENT_STATUS,
    })

    logEvent('Invoice Payment Succeeded', event.id, paymentData)
    return true
  } catch (error) {
    handleError('Invoice Payment Succeeded', event.id, error)
    throw error
  }
}

export async function handleInvoicePaymentFailed(
  event: Stripe.Event
): Promise<boolean> {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  try {
    const subscription =
      await stripeServerClient.subscriptions.retrieve(subscriptionId)
    const paymentIntent = invoice.payment_intent
      ? await stripeServerClient.paymentIntents.retrieve(
          invoice.payment_intent as string
        )
      : null

    const paymentData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'failed',
      customerId,
      subscriptionId,
      amount: invoice.total,
      error: paymentIntent?.last_payment_error?.message,
      metadata: {
        nextPaymentAttempt: invoice.next_payment_attempt,
        subscriptionStatus: subscription.status,
      },
      timestamp: Date.now(),
    }

    const paymentKey = getPaymentStatusKey(invoice.id)
    await redis.set(paymentKey, JSON.stringify(paymentData), {
      ex: CONFIG.TTL.PAYMENT_STATUS,
    })

    logEvent('Invoice Payment Failed', event.id, paymentData)
    return true
  } catch (error) {
    handleError('Invoice Payment Failed', event.id, error)
    throw error
  }
}

// Subscription Handlers
export async function handleSubscriptionCreated(
  event: Stripe.Event
): Promise<boolean> {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  try {
    const subscriptionData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: subscription.status,
      customerId,
      metadata: {
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      timestamp: Date.now(),
    }

    const subscriptionKey = getSubscriptionStatusKey(subscription.id)
    await redis.set(subscriptionKey, JSON.stringify(subscriptionData), {
      ex: CONFIG.TTL.SUBSCRIPTION_STATUS,
    })

    logEvent('Subscription Created', event.id, subscriptionData)
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
  const customerId = subscription.customer as string

  try {
    const subscriptionData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: subscription.status,
      customerId,
      metadata: {
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      timestamp: Date.now(),
    }

    const subscriptionKey = getSubscriptionStatusKey(subscription.id)
    await redis.set(subscriptionKey, JSON.stringify(subscriptionData), {
      ex: CONFIG.TTL.SUBSCRIPTION_STATUS,
    })

    logEvent('Subscription Updated', event.id, subscriptionData)
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
  const customerId = subscription.customer as string

  try {
    const subscriptionData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'deleted',
      customerId,
      metadata: {
        deletedAt: Date.now(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      timestamp: Date.now(),
    }

    const subscriptionKey = getSubscriptionStatusKey(subscription.id)
    await redis.set(subscriptionKey, JSON.stringify(subscriptionData), {
      ex: CONFIG.TTL.SUBSCRIPTION_STATUS,
    })

    logEvent('Subscription Deleted', event.id, subscriptionData)
    return true
  } catch (error) {
    handleError('Subscription Deleted', event.id, error)
    throw error
  }
}

// Payment Intent Handlers
export async function handlePaymentIntentSucceeded(
  event: Stripe.Event
): Promise<boolean> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const customerId = paymentIntent.customer as string

  try {
    const paymentData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'succeeded',
      customerId,
      amount: paymentIntent.amount,
      metadata: {
        currency: paymentIntent.currency,
        paymentMethodType: paymentIntent.payment_method_types[0],
        ...paymentIntent.metadata,
      },
      timestamp: Date.now(),
    }

    const paymentKey = getPaymentStatusKey(paymentIntent.id)
    await redis.set(paymentKey, JSON.stringify(paymentData), {
      ex: CONFIG.TTL.PAYMENT_STATUS,
    })

    logEvent('Payment Intent Succeeded', event.id, paymentData)
    return true
  } catch (error) {
    handleError('Payment Intent Succeeded', event.id, error)
    throw error
  }
}

export async function handlePaymentIntentFailed(
  event: Stripe.Event
): Promise<boolean> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const customerId = paymentIntent.customer as string

  try {
    const paymentData: LogEventData = {
      eventId: event.id,
      type: event.type,
      status: 'failed',
      customerId,
      amount: paymentIntent.amount,
      error: paymentIntent.last_payment_error?.message,
      metadata: {
        currency: paymentIntent.currency,
        paymentMethodType: paymentIntent.payment_method_types[0],
        ...paymentIntent.metadata,
      },
      timestamp: Date.now(),
    }

    const paymentKey = getPaymentStatusKey(paymentIntent.id)
    await redis.set(paymentKey, JSON.stringify(paymentData), {
      ex: CONFIG.TTL.PAYMENT_STATUS,
    })

    logEvent('Payment Intent Failed', event.id, paymentData)
    return true
  } catch (error) {
    handleError('Payment Intent Failed', event.id, error)
    throw error
  }
}

export async function handleVerifiedSetupIntent(
  event: Stripe.Event
): Promise<boolean> {
  const setupIntent = event.data.object as Stripe.SetupIntent
  const setupIntentId = setupIntent.id

  try {
    // Step 1: Retrieve verification data from Redis
    const verificationKey = getSetupVerificationKey(setupIntentId)
    const verificationDataString = await redis.get(verificationKey)

    if (!verificationDataString) {
      const errorData: LogEventData = {
        eventId: event.id,
        type: event.type,
        message: 'Verification data missing',
        setupIntentId,
        timestamp: Date.now(),
        metadata: { error: 'No verification data found' },
      }
      logEvent('Verification data missing', event.id, errorData)
      throw new Error(
        `No verification data found for SetupIntent: ${setupIntentId}`
      )
    }

    const verificationData = JSON.parse(
      verificationDataString as string
    ) as VerificationData

    // Step 2: Check if a subscription already exists for this setupIntent
    const subscriptionStatusKey = getWebhookSubscriptionStatusKey(setupIntentId)
    const subscriptionStatusString = await redis.get(subscriptionStatusKey)

    if (subscriptionStatusString) {
      const subscriptionStatus = JSON.parse(
        subscriptionStatusString as string
      ) as SubscriptionStatus
      if (subscriptionStatus.status === 'active') {
        logEvent('Subscription already active', event.id, {
          eventId: event.id,
          type: event.type,
          timestamp: Date.now(),
          setupIntentId,
          subscriptionId: subscriptionStatus.subscriptionId || 'unknown',
        })
        return true
      }
    }

    // Step 3: Parse the necessary metadata
    const priceId = verificationData.metadata?.priceId
    const paymentMethodId = verificationData.paymentMethodId
    const studentKey = verificationData.studentKey

    if (!priceId || !paymentMethodId || !studentKey) {
      throw new Error(
        'Missing required priceId, paymentMethodId, or studentKey'
      )
    }

    // Step 4: Fetch students data from Redis
    const studentsFromRedis = await redis.get(studentKey)

    if (!studentsFromRedis) {
      throw new Error(
        `Failed to retrieve students from Redis with key: ${studentKey}`
      )
    }

    const students = JSON.parse(studentsFromRedis as string)

    if (
      !Array.isArray(students) ||
      students.some((student) => !student.monthlyRate)
    ) {
      throw new Error('Invalid student data retrieved from Redis.')
    }

    // Step 6: Create the subscription
    const subscription = await stripeServerClient.subscriptions.create({
      customer: verificationData.customerId as string,
      default_payment_method: paymentMethodId as string,
      items: students.map((student) => ({
        price_data: {
          currency: 'usd',
          unit_amount: student.monthlyRate * 100,
          recurring: { interval: 'month' },
          product: process.env.STRIPE_PRODUCT_ID!,
        },
        quantity: 1,
        metadata: {
          studentId: student.id,
          studentName: student.name,
        },
      })),
      collection_method: 'charge_automatically',
      payment_settings: {
        payment_method_types: ['us_bank_account'],
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        studentKey,
        setupIntentId,
      },
    })

    // Step 7: Update Redis with subscription details
    const updatedStatus: SubscriptionStatus = {
      status: 'active',
      subscriptionId: subscription.id,
      createdAt: new Date(verificationData.timestamp).toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await redis.set(subscriptionStatusKey, JSON.stringify(updatedStatus), {
      ex: CONFIG.TTL.SUBSCRIPTION_STATUS,
    })

    logEvent('Subscription created successfully', event.id, {
      eventId: event.id,
      type: event.type,
      timestamp: Date.now(),
      setupIntentId,
      subscriptionId: subscription.id,
      status: 'active',
    })

    return true
  } catch (error) {
    // Handle retries on subscription creation failure
    const retryKey = `stripe:recovery:attempt:${setupIntentId}`
    const retryAttempt = await redis.get(retryKey)
    const currentAttempt = parseInt(retryAttempt?.toString() ?? '0', 10)

    if (currentAttempt < CONFIG.RETRY.MAX_RETRIES[1]) {
      const nextAttempt = currentAttempt + 1
      const delay = CONFIG.RETRY.DELAYS[1][currentAttempt]

      await redis.set(retryKey, nextAttempt.toString(), { ex: delay })

      logEvent('Retrying subscription creation', event.id, {
        eventId: event.id,
        type: event.type,
        timestamp: Date.now(),
        setupIntentId,
        attempt: nextAttempt,
        delay,
      })

      setTimeout(async () => {
        try {
          await handleVerifiedSetupIntent(event)
        } catch (retryError) {
          handleError(
            'Subscription Creation Retry Failed',
            event.id,
            retryError
          )
        }
      }, delay * 1000)
    } else {
      logEvent('Max retries reached for subscription creation', event.id, {
        eventId: event.id,
        type: event.type,
        timestamp: Date.now(),
        setupIntentId,
        attempts: currentAttempt,
      })
    }

    handleError('Subscription Creation Failed', event.id, error)
    throw error
  }
}

// Event Handlers Map
export const eventHandlers: Record<
  string,
  (event: Stripe.Event) => Promise<boolean>
> = {
  'setup_intent.succeeded': handleSetupIntentSucceeded,
  'setup_intent.requires_action': handleSetupIntentRequiresAction,
  'invoice.created': handleInvoiceCreated,
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  verified_setup_intent: handleVerifiedSetupIntent,
} as const
