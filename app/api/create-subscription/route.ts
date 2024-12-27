import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'

import {
  getBillingCycleAnchor,
  getRedisKey,
  handleError,
  logEvent,
  setRedisKey,
  verifyPaymentSetup,
} from '../../../lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { setupIntentId, oneTimeCharge } = await request.json()

    // Step 1: Retrieve the setup intent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    const customerId = setupIntent.customer as string
    const paymentMethodId = setupIntent.payment_method as string
    const students = JSON.parse(setupIntent.metadata?.students || '[]')

    logEvent('Subscription Creation Initiated', setupIntentId, { customerId })

    // Step 2: Check Redis for an existing subscription
    const existingSubscriptionId = await checkExistingSubscription(customerId)
    if (existingSubscriptionId) {
      logEvent('Existing Subscription Found', existingSubscriptionId, {
        customerId,
      })
      return NextResponse.json({
        message: 'Subscription already exists.',
        subscriptionId: existingSubscriptionId,
      })
    }

    // Step 3: Verify US bank account payment method
    const paymentMethod = await verifyUsBankAccount(customerId)
    await saveBankAccountInRedis(paymentMethod)

    // Step 4: Save initial setup state in Redis
    await saveInitialSetupState(customerId)

    // Step 5: Process One-Time Charge (if requested)
    if (oneTimeCharge) {
      // The one-time charge is handled in a fire-and-forget manner
      processOneTimeCharge(customerId, paymentMethodId, students).catch(
        (error) => {
          console.error('One-Time Charge Failed:', error)
          logEvent('One-Time Charge Error', setupIntentId, {
            error: error.message,
          })
        }
      )
    }

    // Step 6: Verify the payment setup
    const success = await verifyPaymentSetup(customerId)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to verify payment setup.' },
        { status: 500 }
      )
    }

    // Step 7: Create the subscription
    const subscription = await createSubscription({
      customerId,
      paymentMethodId,
      students,
    })

    // Step 8: Update Redis with subscription details
    await updateSubscriptionInRedis(customerId, subscription)

    logEvent('Subscription Created Successfully', subscription.id, {
      subscriptionId: subscription.id,
      status: subscription.status,
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully.',
      subscriptionId: subscription.id,
    })
  } catch (error) {
    await handleSubscriptionError(error, request)
    return NextResponse.json(
      { error: 'Failed to create subscription.' },
      { status: 500 }
    )
  }
}

async function checkExistingSubscription(
  customerId: string
): Promise<string | null> {
  const redisKey = `payment_setup:${customerId}`
  const existingData = await getRedisKey(redisKey)

  if (existingData && existingData.subscriptionId) {
    return existingData.subscriptionId
  }

  return null
}

async function verifyUsBankAccount(
  customerId: string
): Promise<Stripe.PaymentMethod> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'us_bank_account',
  })

  if (!paymentMethods.data.length) {
    throw new Error('No US bank account payment method found for customer.')
  }

  return paymentMethods.data[0]
}

async function saveBankAccountInRedis(paymentMethod: Stripe.PaymentMethod) {
  const redisKey = `bank_account:${paymentMethod.customer}`
  const bankAccountData = {
    customerId: paymentMethod.customer,
    verified: true,
    last4: paymentMethod.us_bank_account?.last4,
    timestamp: Date.now(),
  }

  await setRedisKey(redisKey, bankAccountData, 86400) // TTL: 1 day

  logEvent(
    'Bank Account Saved in Redis',
    paymentMethod.customer as string,
    bankAccountData
  )
}

async function saveInitialSetupState(customerId: string) {
  const redisKey = `payment_setup:${customerId}`
  const initialState = {
    customerId,
    subscriptionId: null,
    setupCompleted: true,
    bankVerified: true,
    subscriptionActive: false,
    timestamp: Date.now(),
  }

  await setRedisKey(redisKey, initialState, 86400) // TTL: 1 day

  logEvent('Initial Setup State Saved in Redis', customerId, initialState)
}

// Process One-Time Charge (Fire-and-Forget)
async function processOneTimeCharge(
  customerId: string,
  paymentMethodId: string,
  students: any[]
) {
  try {
    const oneTimeChargeAmount = students.reduce(
      (sum, student) => sum + student.monthlyRate * 100, // Convert to cents
      0
    )

    if (oneTimeChargeAmount > 0) {
      logEvent('Processing One-Time Charge', oneTimeChargeAmount, {
        customerId,
      })

      // Create a PaymentIntent for the one-time charge
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customerId,
        payment_method: paymentMethodId,
        amount: oneTimeChargeAmount,
        currency: 'usd',
        confirm: true, // Immediately confirm the payment
        description: `One-time upfront charge for students' December fees`,
        metadata: {
          chargeType: 'One-time fee',
          students: JSON.stringify(students),
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      })

      logEvent('One-Time Charge Successful', paymentIntent.id, {
        amount: oneTimeChargeAmount,
        status: paymentIntent.status,
      })

      // If the payment intent is still processing
      if (paymentIntent.status === 'processing') {
        logEvent('One-Time Charge Processing', paymentIntent.id, {
          amount: oneTimeChargeAmount,
        })
      }
    } else {
      logEvent('No valid amount for One-Time Charge', {})
    }
  } catch (error) {
    console.error('Error creating one-time charge:', error)
    throw error // Log and allow calling function to handle the error
  }
}

async function createSubscription({
  customerId,
  paymentMethodId,
  students,
}: {
  customerId: string
  paymentMethodId: string
  students: any[]
}): Promise<Stripe.Subscription> {
  const totalAmount = students.reduce(
    (sum, student) => sum + student.monthlyRate * 100,
    0
  )

  if (!students.length || totalAmount <= 0) {
    throw new Error('No valid students selected or total amount is invalid.')
  }

  const billingCycleAnchor = getBillingCycleAnchor(5) // Set anchor to the 5th day of the next month

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    default_payment_method: paymentMethodId,
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
    billing_cycle_anchor: billingCycleAnchor,
    proration_behavior: 'none',
    metadata: {
      students: JSON.stringify(students),
    },
    collection_method: 'charge_automatically',
    payment_settings: {
      payment_method_types: ['us_bank_account'],
      save_default_payment_method: 'on_subscription',
    },
  })

  return subscription
}

async function updateSubscriptionInRedis(
  customerId: string,
  subscription: Stripe.Subscription
) {
  const redisKey = `payment_setup:${customerId}`
  const subscriptionData = {
    customerId,
    subscriptionId: subscription.id,
    setupCompleted: true,
    bankVerified: true,
    subscriptionActive: subscription.status === 'active',
    timestamp: Date.now(),
  }

  await setRedisKey(redisKey, subscriptionData, 86400)

  logEvent(
    'Subscription Data Saved in Redis',
    subscription.id,
    subscriptionData
  )
}

async function handleSubscriptionError(error: unknown, request: Request) {
  const { setupIntentId, customerId } = await request.json()
  const redisKey = `payment_setup:${customerId}`

  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error occurred.'

  logEvent('Error Creating Subscription', setupIntentId, {
    customerId,
    errorMessage,
  })

  await redis.del(redisKey)

  handleError('Subscription Creation Failed', setupIntentId, error)

  return {
    success: false,
    error: errorMessage,
  }
}
