import { NextResponse } from 'next/server'

import { stripeServerClient } from '@/lib/utils/stripe'

import { eventHandlers } from './event-handlers'
import {
  detectAndReplayMissingEvents,
  detectAndReplayMissingEventsInChunks,
} from './recovery'
import { logEvent } from './utils'
import { validateAndTrackEvent } from './webhook-validation'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET')
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    throw new Error('Missing stripe-signature header')
  }

  try {
    const event = stripeServerClient.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    const success = await validateAndTrackEvent(event)
    if (success) {
      const handler = eventHandlers[event.type]
      if (handler) await handler(event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logEvent('Webhook Error', 'system', {
      eventId: 'system',
      type: 'webhook.error',
      error: error instanceof Error ? error.message : String(error),
    })
    return new NextResponse('Webhook Error', { status: 400 })
  }
}

// Export recovery functions for use in recovery endpoint
export { detectAndReplayMissingEvents, detectAndReplayMissingEventsInChunks }
