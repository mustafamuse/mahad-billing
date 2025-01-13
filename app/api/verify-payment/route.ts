import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    const { setupIntentId } = await request.json()
    console.log('🔍 Verifying payment setup for setupIntent:', setupIntentId)

    // Get the setupIntent to get the customer ID
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    if (!setupIntent.customer) {
      console.log('❌ No customer found for setupIntent:', setupIntentId)
      return NextResponse.json({ verified: false })
    }

    const customerId = setupIntent.customer as string

    // Check payment setup status
    const paymentSetup = await redis.get(`payment_setup:${customerId}`)
    const bankAccount = await redis.get(`bank_account:${customerId}`)

    console.log('📝 Verification data:', {
      hasPaymentSetup: !!paymentSetup,
      hasBankAccount: !!bankAccount,
      timestamp: new Date().toISOString(),
    })

    if (!paymentSetup || !bankAccount) {
      console.log('❌ Missing required data:', {
        paymentSetup: !!paymentSetup,
        bankAccount: !!bankAccount,
      })
      return NextResponse.json({ verified: false })
    }

    // Get customer's subscription status
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    })

    const isActive = subscriptions.data[0]?.status === 'active'

    console.log('✅ Verification complete:', {
      customerId,
      isActive,
      subscriptionId: subscriptions.data[0]?.id,
    })

    return NextResponse.json({
      verified: true,
      isActive,
      subscriptionId: subscriptions.data[0]?.id,
    })
  } catch (error) {
    console.error('❌ Verification error:', error)
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    )
  }
}
