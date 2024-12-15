import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'
import { verifyPaymentSetup } from '@/lib/utils'

import {
  getRedisKey,
  handleError,
  logEvent,
  setRedisKey,
} from '../../../lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { setupIntentId } = await request.json()

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

    // Step 5: Verify the payment setup
    const success = await verifyPaymentSetup(customerId)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to verify payment setup.' },
        { status: 500 }
      )
    }

    // Step 6: Create the subscription
    const subscription = await createSubscription({
      customerId,
      paymentMethodId,
      students,
    })

    // Step 7: Update Redis with subscription details
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

async function createSubscription({
  customerId,
  paymentMethodId,
  students,
}: {
  customerId: string
  paymentMethodId: string
  students: any[]
}): Promise<Stripe.Subscription> {
  const firstDayOfNextMonth = new Date()
  firstDayOfNextMonth.setMonth(firstDayOfNextMonth.getMonth() + 1)
  firstDayOfNextMonth.setDate(1)
  firstDayOfNextMonth.setHours(0, 0, 0, 0)

  const billingCycleAnchor = Math.floor(firstDayOfNextMonth.getTime() / 1000)

  return stripe.subscriptions.create({
    customer: customerId,
    default_payment_method: paymentMethodId,
    items: students.map((student: any) => ({
      price_data: {
        currency: 'usd',
        unit_amount: student.monthlyRate * 100, // Convert to cents
        recurring: { interval: 'month' },
        product: process.env.STRIPE_PRODUCT_ID!,
      },
      quantity: 1,
      metadata: {
        studentId: student.id,
        studentName: student.name,
        familyId: student.familyId || null,
        baseRate: process.env.BASE_RATE || '0',
        monthlyRate: student.monthlyRate.toString(),
        discount: (
          parseFloat(process.env.BASE_RATE || '0') - student.monthlyRate
        ).toString(),
      },
    })),
    billing_cycle_anchor: billingCycleAnchor, // Align billing to the 1st of the next month
    proration_behavior: 'none', // Avoid prorated charges
    metadata: { initiatedBy: 'API' },
    collection_method: 'charge_automatically',
    payment_settings: {
      payment_method_types: ['us_bank_account'],
      save_default_payment_method: 'on_subscription',
    },
  })
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

  await setRedisKey(redisKey, subscriptionData, 86400) // TTL: 1 day

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

  // Clean up Redis
  await redis.del(redisKey)

  handleError('Subscription Creation Failed', setupIntentId, error)

  // Return error response with a specific message
  return {
    success: false,
    error: errorMessage,
  }
}
