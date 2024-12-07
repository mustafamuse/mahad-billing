import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { verifyPaymentSetup } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    const { setupIntentId } = await request.json()
    console.log('🔄 Verifying setup:', { setupIntentId })

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    const customerId = setupIntent.customer as string

    console.log('📝 Setup Intent:', {
      id: setupIntent.id,
      status: setupIntent.status,
      customerId,
    })

    const success = await verifyPaymentSetup(customerId)
    console.log('✅ Verification result:', { success, customerId })

    return NextResponse.json({ success })
  } catch (error) {
    console.error('❌ Setup verification error:', error)
    return NextResponse.json(
      { error: 'Setup verification failed' },
      { status: 500 }
    )
  }
}
