import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { redis } from '@/lib/redis'
import { verifyPaymentSetup } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  debugger
  try {
    const { setupIntentId } = await request.json()

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    const customerId = setupIntent.customer as string
    const paymentMethodId = setupIntent.payment_method as string
    const students = JSON.parse(setupIntent.metadata?.students || '[]')
    console.log('🔍 Creating subscription for customer:', customerId)

    const redisKey = `payment_setup:${customerId}`

    // Check Redis for existing subscription
    const existingData: any = await redis.get(redisKey)
    const existingSubscriptionId =
      typeof existingData === 'string'
        ? JSON.parse(existingData).subscriptionId
        : existingData?.subscriptionId

    if (existingSubscriptionId) {
      console.log('⚠️ Subscription already exists:', {
        subscriptionId: existingSubscriptionId,
      })
      return NextResponse.json({
        message: 'Subscription already exists.',
        subscriptionId: existingSubscriptionId,
      })
    }

    // Check if a US bank account payment method is attached
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'us_bank_account',
    })

    if (!paymentMethods.data.length) {
      console.log('❌ No bank account payment method attached for customer.')
      return NextResponse.json(
        { error: 'No bank account payment method found.' },
        { status: 400 }
      )
    }
    // Retrieve the first bank account payment method
    const paymentMethod = paymentMethods.data[0]

    // Save bank account details in Redis
    await redis.set(
      `bank_account:${paymentMethod.customer}`,
      JSON.stringify({
        customerId: paymentMethod.customer,
        verified: true,
        last4: paymentMethod.us_bank_account?.last4,
        timestamp: Date.now(),
      })
    )

    console.log('✅ Bank account details saved in Redis:', {
      customerId: paymentMethod.customer,
      last4: paymentMethod.us_bank_account?.last4,
    })

    // Save initial setup state in Redis to prevent race conditions
    await redis.set(
      redisKey,
      JSON.stringify({
        customerId,
        subscriptionId: null,
        setupCompleted: true,
        bankVerified: true,
        subscriptionActive: false,
        timestamp: Date.now(),
      })
    )

    const success = await verifyPaymentSetup(customerId)

    if (!success)
      return NextResponse.json(
        { error: 'Failed to create subscription.' },
        { status: 500 }
      )

    // Create subscription
    const subscription = await stripe.subscriptions.create({
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
      // billing_cycle_anchor: billingAnchor,
      proration_behavior: 'none',
      metadata: { initiatedBy: 'API' },
      collection_method: 'charge_automatically',
      payment_settings: {
        payment_method_types: ['us_bank_account'],
        save_default_payment_method: 'on_subscription',
      },
    })

    // Update Redis with subscription details
    await redis.set(
      redisKey,
      JSON.stringify({
        customerId,
        subscriptionId: subscription.id,
        setupCompleted: true,
        bankVerified: true,
        subscriptionActive: subscription.status === 'active',
        timestamp: Date.now(),
      })
    )

    console.log('✅ Subscription created successfully:', {
      subscriptionId: subscription.id,
      status: subscription.status,
    })

    return NextResponse.json({
      message: 'Subscription created successfully.',
      subscriptionId: subscription.id,
    })
  } catch (error) {
    console.error('❌ Error creating subscription:', error)

    // Clean up Redis in case of an error
    const { customerId } = await request.json()
    const redisKey = `payment_setup:${customerId}`
    await redis.del(redisKey)

    return NextResponse.json(
      { error: 'Failed to create subscription.' },
      { status: 500 }
    )
  }
}
