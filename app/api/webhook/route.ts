import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { eventHandlers } from './event-handlers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  // Early return if no signature
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Missing webhook signature or secret')
    return NextResponse.json(
      { message: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    console.log(`✅ Webhook verified: ${event.id}`)

    // Process the event
    const handler = eventHandlers[event.type as keyof typeof eventHandlers]
    if (handler) {
      await handler(event)
      console.log(`✅ Successfully processed ${event.type}`)
    } else {
      console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ message: 'Processed' }, { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`❌ Webhook Error: ${errorMessage}`)
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    )
  }
}

export const dynamic = 'force-dynamic'
