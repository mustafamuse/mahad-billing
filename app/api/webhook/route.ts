import { headers } from 'next/headers'

import getRawBody from 'raw-body'
import { Readable } from 'stream'
import Stripe from 'stripe'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'

import { eventHandlers } from './event-handlers'

// 1. Insert or update the WebhookEvent
async function handleWebhookEvent(event: Stripe.Event) {
  let webhookEvent = await prisma.webhookEvent.findUnique({
    where: { stripeEventId: event.id },
  })

  if (!webhookEvent) {
    webhookEvent = await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        payload: event.data.object as any,
        processed: false,
      },
    })
  } else {
    if (webhookEvent.processed) {
      console.log(`🚫 Already processed event ${event.id}, skipping.`)
      return
    }
  }

  const handler = eventHandlers[event.type]
  if (handler) {
    try {
      await handler(event)
    } catch (err) {
      // We'll leave `processed = false` so you can reprocess if needed
      console.error('❌ Error in handler:', err)
      throw err
    }
  } else {
    console.log(`Unhandled event type: ${event.type}`)
  }

  await prisma.webhookEvent.update({
    where: { id: webhookEvent.id },
    data: { processed: true },
  })

  console.log(`✅ Webhook event ${event.id} marked as processed.`)
}

export const runtime = 'edge' // Optional: Use edge runtime for faster webhook processing
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const signature = headers().get('stripe-signature')
  const retryCount = headers().get('stripe-retry-count')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    console.error('❌ Missing required webhook parameters')
    return new Response(
      JSON.stringify({ error: 'Missing required webhook parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const readableBody = Readable.from(req.body as any)
    const rawBody = await getRawBody(readableBody, { encoding: 'utf-8' })

    const event = stripeServerClient.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    )

    if (retryCount) {
      console.log(`🔄 Webhook retry #${retryCount} for event ${event.id}`)
    }

    await handleWebhookEvent(event)

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('❌ Webhook error:', err)

    // If it's a signature error, respond with 400 so Stripe doesn't keep retrying forever
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return new Response('Invalid signature', { status: 400 })
    }

    // For other errors, you can respond 400 or 500. Stripe will retry if it's a 400+ code
    return new Response('Webhook error', { status: 400 })
  }
}
