import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'setup_intent.succeeded':
        const setupIntent = event.data.object as Stripe.SetupIntent
        console.log('SetupIntent succeeded:', setupIntent.id)
        // Add your business logic here
        break

      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription
        console.log('Subscription created:', subscription.id)
        // Add your business logic here
        break

      // Add other event cases as needed

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction) {
      // Log important events
      console.log('Webhook received:', {
        eventType: event.type,
        eventId: event.id,
        objectId: event.data.object.id,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    if (isProduction) {
      // Log to your error tracking service
      console.error('Critical webhook error:', {
        error,
        eventType: event?.type,
        eventId: event?.id,
        timestamp: new Date().toISOString(),
      })
    }

    // Always return a 200 to acknowledge receipt
    return NextResponse.json({
      error: 'Webhook processed with errors',
      acknowledged: true,
    })
  }
}
