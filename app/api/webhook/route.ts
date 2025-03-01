import { NextResponse } from 'next/server'

import type { Stripe } from 'stripe'

import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
  syncStripeDataToDatabase,
} from '@/lib/services/stripe-sync'
import { stripeServerClient } from '@/lib/stripe'

import { eventHandlers } from './event-handlers'

// Extract customer ID from various event types
function extractCustomerId(event: Stripe.Event): string | undefined {
  const object = event.data.object as any

  if (!object || typeof object !== 'object') return undefined // Ensure object exists

  // Helper function to safely extract customer ID
  const getCustomerId = (customer: unknown): string | undefined => {
    if (typeof customer === 'string') return customer
    if (customer && typeof customer === 'object' && 'id' in customer) {
      return (customer as { id: string }).id
    }
    return undefined
  }

  return (
    getCustomerId(object.customer) ||
    getCustomerId(object.customer_id) ||
    getCustomerId(object.billing_details?.customer) ||
    getCustomerId(object.invoice?.customer) ||
    getCustomerId(object.subscription?.customer) ||
    getCustomerId(object.charge?.customer) ||
    getCustomerId(object.payment_intent?.customer) ||
    (event.type.startsWith('customer.') ? object.id : undefined)
  )
}

export async function POST(req: Request) {
  console.log('🚀 [WEBHOOK] Received Stripe webhook event')
  const body = await req.text()

  // Get the signature from the headers
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.error('❌ [WEBHOOK] Missing Stripe signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    // Verify the webhook signature
    const event = stripeServerClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    console.log(
      `✅ [WEBHOOK] Verified webhook signature for event: ${event.id}`
    )
    console.log(`📝 [WEBHOOK] Event type: ${event.type}`)

    // Check if we've already processed this event
    const isProcessed = await isWebhookEventProcessed(event.id)
    if (isProcessed) {
      console.log(`⚠️ [WEBHOOK] Event ${event.id} already processed, skipping`)
      return NextResponse.json(
        { message: 'Already processed' },
        { status: 200 }
      )
    }

    // Extract customer ID from the event
    const customerId = extractCustomerId(event)
    if (customerId) {
      console.log(`👤 [WEBHOOK] Event for customer: ${customerId}`)
    } else {
      console.log(`⚠️ [WEBHOOK] No customer ID found in event`)
    }

    // Get the appropriate handler for this event type
    const handler = eventHandlers[event.type as keyof typeof eventHandlers]

    if (handler) {
      console.log(`🔄 [WEBHOOK] Processing event ${event.type} with handler`)
      await handler(event)
      console.log(`✅ [WEBHOOK] Successfully processed ${event.type}`)

      // If this is a subscription-related event, sync the data
      if (
        event.type.startsWith('customer.subscription.') ||
        event.type.startsWith('invoice.') ||
        event.type.startsWith('charge.') ||
        event.type.startsWith('payment_intent.') ||
        event.type === 'setup_intent.succeeded'
      ) {
        if (customerId) {
          console.log(
            `🔄 [WEBHOOK] Syncing Stripe data for customer: ${customerId}`
          )
          // Sync Stripe data with our database
          await syncStripeDataToDatabase(customerId)
          console.log(`✅ [WEBHOOK] Completed sync for customer: ${customerId}`)
        } else {
          console.log(
            `⚠️ [WEBHOOK] Cannot sync data: No customer ID found in event`
          )
        }
      }
    } else {
      console.log(`⚠️ [WEBHOOK] Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    console.log(`🔄 [WEBHOOK] Marking event as processed: ${event.id}`)
    await markWebhookEventProcessed(event.id, event.type, customerId)

    console.log(
      `🎉 [WEBHOOK] Successfully completed processing for event: ${event.id}`
    )
    return NextResponse.json({ message: 'Processed' }, { status: 200 })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`❌ [WEBHOOK] Error: ${errorMessage}`)
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    )
  }
}

export const dynamic = 'force-dynamic'
