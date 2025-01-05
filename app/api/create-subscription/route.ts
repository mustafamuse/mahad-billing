/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'

import {
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
  let lockKey: string | null = null

  try {
    let requestBody: any
    try {
      requestBody = await request.json()
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      )
    }

    const { setupIntentId, oneTimeCharge } = requestBody || {}

    // Parse and validate the request body
    if (!setupIntentId || typeof oneTimeCharge !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. Missing setupIntentId or oneTimeCharge.' },
        { status: 400 }
      )
    }

    // Add Redis lock to prevent concurrent requests
    lockKey = `subscription_lock:${setupIntentId}`
    const lock = await getRedisKey(lockKey)
    if (lock) {
      return NextResponse.json({
        message: 'Subscription creation in progress.',
        status: 'pending',
      })
    }

    // Set lock with status
    await setRedisKey(
      lockKey,
      {
        status: 'processing',
        timestamp: new Date().toISOString(),
      },
      300
    ) // 5 minute lock

    // Step 1: Retrieve the setup intent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    if (!setupIntent.customer || !setupIntent.payment_method) {
      return NextResponse.json(
        {
          error:
            'Invalid setup intent data. Missing customer or payment method.',
        },
        { status: 400 }
      )
    }

    const customerId = setupIntent.customer as string
    const paymentMethodId = setupIntent.payment_method as string
    const students = JSON.parse(setupIntent.metadata?.students || '[]')

    logEvent('Subscription Creation Initiated', setupIntentId, { customerId })

    // Step 2: Check for existing subscription
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

    // Step 5: Handle One-Time Charge (Fire-and-Forget)
    if (oneTimeCharge) {
      processOneTimeCharge(customerId, paymentMethodId, students).catch(
        (error) => {
          console.error('Fire-and-Forget Charge Failed:', error.message)
        }
      )
    }

    // Step 6: Verify payment setup
    const success = await verifyPaymentSetup(customerId)
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to verify payment setup.' },
        { status: 500 }
      )
    }

    // Step 7: Create subscription with idempotency
    const idempotencyKey = `sub_${setupIntentId}`
    const subscription = await createSubscription({
      customerId,
      paymentMethodId,
      idempotencyKey,
    })

    // Step 8: Update Redis with subscription details
    await updateSubscriptionInRedis(customerId, subscription)

    // Step 9: Update subscription status in Redis
    await setRedisKey(
      `subscription_status:${setupIntentId}`,
      {
        status: 'completed',
        subscriptionId: subscription.id,
        updatedAt: new Date().toISOString(),
      },
      86400
    )

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
    console.error('Error in Subscription Handler:', error)
    await handleSubscriptionError(error, request)
    return NextResponse.json(
      { error: 'Failed to create subscription.' },
      { status: 500 }
    )
  } finally {
    // Always clear the lock if it was set
    if (lockKey) {
      await setRedisKey(lockKey, null, 0)
    }
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
  logEvent('Starting One-Time Charge Processing', customerId, { students })

  try {
    const oneTimeChargeAmount = students.reduce(
      (sum, student) => sum + student.monthlyRate * 100,
      0
    )

    if (oneTimeChargeAmount > 0) {
      logEvent('Processing One-Time Charge', customerId, {
        amount: oneTimeChargeAmount,
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
          createdBy: 'Subscription API',
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

      if (paymentIntent.status === 'processing') {
        logEvent('One-Time Charge Processing', paymentIntent.id, {
          amount: oneTimeChargeAmount,
        })
      }
    } else {
      logEvent('No valid amount for One-Time Charge', customerId)
    }
  } catch (error) {
    console.error('Error creating one-time charge:', error)
    logEvent('One-Time Charge Failed', customerId, {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    logEvent('Completed One-Time Charge Processing', customerId)
  }
}
async function createSubscription({
  customerId,
  paymentMethodId,
  idempotencyKey,
}: {
  customerId: string
  paymentMethodId: string
  idempotencyKey: string
}): Promise<Stripe.Subscription> {
  const setupIntentMetadataKey = `setup_intent_metadata:${customerId}`

  console.log(
    `Fetching metadata from Redis with key: ${setupIntentMetadataKey}`
  )

  // Fetch metadata from Redis
  const metadataFromRedis = await redis.get(setupIntentMetadataKey)

  if (!metadataFromRedis) {
    console.error(`❌ Metadata not found for key: ${setupIntentMetadataKey}`)
    throw new Error(
      `Metadata not found in Redis for key: ${setupIntentMetadataKey}`
    )
  }

  // Handle both string and object cases for metadataFromRedis
  let parsedMetadata: { studentKey: string; total: string; customerId: string }

  if (typeof metadataFromRedis === 'string') {
    try {
      parsedMetadata = JSON.parse(metadataFromRedis)
    } catch (error) {
      console.error(`❌ Failed to parse Redis metadata:`, metadataFromRedis)
      throw new Error(
        `Failed to parse metadata from Redis: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  } else if (typeof metadataFromRedis === 'object') {
    // If metadataFromRedis is already an object, use it directly
    parsedMetadata = metadataFromRedis as any
  } else {
    console.error(
      `❌ Unexpected type for metadataFromRedis:`,
      typeof metadataFromRedis
    )
    throw new Error(
      `Unexpected type for metadataFromRedis: ${typeof metadataFromRedis}`
    )
  }

  // Validate parsed metadata
  const { studentKey } = parsedMetadata
  if (!studentKey) {
    throw new Error('Missing studentKey in metadata retrieved from Redis.')
  }

  console.log('Fetching students from Redis using key:', studentKey)

  // Retrieve students from Redis
  const studentsFromRedis = await redis.get(studentKey)

  if (!studentsFromRedis) {
    throw new Error(
      `Failed to retrieve students from Redis with key: ${studentKey}`
    )
  }

  // Handle both string and object cases for studentsFromRedis
  let students: any[]
  if (typeof studentsFromRedis === 'string') {
    try {
      students = JSON.parse(studentsFromRedis)
    } catch (error) {
      console.error(
        `❌ Failed to parse student data from Redis:`,
        studentsFromRedis
      )
      throw new Error(
        `Failed to parse student data from Redis: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  } else if (typeof studentsFromRedis === 'object') {
    students = studentsFromRedis as any
  } else {
    throw new Error(
      `Unexpected type for studentsFromRedis: ${typeof studentsFromRedis}`
    )
  }

  // Validate students data
  if (
    !students ||
    !Array.isArray(students) ||
    students.some((s) => !s.monthlyRate)
  ) {
    throw new Error('Invalid student data retrieved from Redis.')
  }

  // Calculate total subscription amount
  const totalAmount = students.reduce(
    (sum, student) => sum + student.monthlyRate * 100, // Stripe accepts cents
    0
  )

  if (!students.length || totalAmount <= 0) {
    throw new Error('No valid students selected or total amount is invalid.')
  }

  console.log('📅 Creating subscription with immediate charge.')

  // Create the subscription in Stripe
  let subscription
  try {
    subscription = await stripe.subscriptions.create(
      {
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
        proration_behavior: 'none',
        metadata: {
          studentKey, // Keep the reference key for tracking
        },
        collection_method: 'charge_automatically',
        payment_settings: {
          payment_method_types: ['us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
      },
      {
        idempotencyKey,
      }
    )
  } catch (error) {
    console.error('❌ Error creating subscription in Stripe:', error)
    throw new Error('Failed to create subscription in Stripe.')
  }

  console.log('🔍 Subscription created successfully:', subscription.id)

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
