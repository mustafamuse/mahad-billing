import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { stripeServerClient } from '@/lib/stripe'

import { eventHandlers } from './event-handlers'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse('Webhook Error: Missing signature', { status: 400 })
  }

  try {
    const event = stripeServerClient.webhooks.constructEvent(
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
