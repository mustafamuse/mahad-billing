// /api/webhook.js

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { BASE_RATE } from '@/lib/data'
import { redis } from '@/lib/redis'
import { Student, PaymentNotification } from '@/lib/types'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Update the logging helper to be more detailed
function logPaymentEvent(type: string, data: any, metadata?: string) {
  console.log(`\n=== STRIPE WEBHOOK EVENT: ${type} ===`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('Data:', JSON.stringify(data, null, 2))
  if (metadata) console.log('Metadata:', metadata)
  console.log('=====================================\n')
}

export async function POST(request: Request) {
  debugger
  const headersList = headers()
  console.log('\n🔔 Webhook Request Headers:', {
    'stripe-signature': headersList.get('stripe-signature'),
    'content-type': headersList.get('content-type'),
  })

  try {
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
      logPaymentEvent(event.type, event.data.object)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    const eventId = event.id
    const eventKey = `stripe_event:${eventId}`

    const exists = await redis.get(eventKey)
    if (exists) {
      console.warn(`🚨 Duplicate webhook detected: ${eventId}`)
      return NextResponse.json({ received: true })
    }

    await redis.set(eventKey, 'processed', { ex: 86400 }) // 86400 seconds = 24 hours
    debugger
    switch (event.type) {
      case 'invoice.payment_succeeded':
        try {
          console.log('You subscription is active')
          const invoice = event.data.object as Stripe.Invoice
          const subscriptionId = invoice.subscription
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(
              subscriptionId.toString()
            )

            const redisKey = `payment_setup:${subscription.customer}`

            await redis.set(
              redisKey,
              JSON.stringify({
                subscriptionId: subscription.id,
                setupCompleted: true, // Initial setup, still awaiting payment verification
                bankVerified: true, // Awaiting bank verification if applicable
                subscriptionActive: subscription.status === 'active',
                timestamp: Date.now(),
              })
            )
            // Update setup status
            const setupStatus = await redis.get(
              `payment_setup:${subscription.customer}`
            )
            if (setupStatus) {
              // Fix: Handle case where setupStatus might be an object
              const currentStatus =
                typeof setupStatus === 'string'
                  ? JSON.parse(setupStatus)
                  : setupStatus

              await redis.set(
                `payment_setup:${subscription.customer}`,
                JSON.stringify({
                  ...currentStatus,
                  subscriptionId: subscription.id,
                  subscriptionActive: true,
                  timestamp: Date.now(),
                })
              )
            }
          }
        } catch (error) {
          await redis.del(eventKey)
          console.error('Error in subscription.created handler:', error)
        }
        break

      case 'invoice.payment_failed':
        try {
          debugger
          console.log('We have ')
          //TODO: Add notification here

          // Extract the invoice object from the event
          const invoice = event.data.object as Stripe.Invoice

          // Extract relevant information
          const customerId = invoice.customer // The customer ID related to the failed payment
          const subscriptionId = invoice.subscription // The subscription ID

          const redisKey = `payment_setup:${customerId}`

          // Check if the Redis key already exists
          const existingData = await redis.get(redisKey)

          if (existingData) {
            const existingSubscription =
              typeof existingData === 'string'
                ? JSON.parse(existingData).subscriptionId
                : existingData

            // Check if the subscriptionId in Redis matches the incoming subscriptionId
            if (existingSubscription.subscriptionId === subscriptionId) {
              // If it's the same subscription, we update the data
              console.log('Subscription matches, updating Redis data')

              // Overwrite with the updated data
              await redis.set(
                redisKey,
                JSON.stringify({
                  subscriptionId: subscriptionId,
                  setupCompleted: false, // Initial setup, still awaiting payment verification
                  bankVerified: false, // Awaiting bank verification if applicable
                  subscriptionActive: false, // Subscription is not active as payment failed
                  timestamp: Date.now(),
                })
              )

              console.log('Subscription data saved or updated in Redis')
            } else {
              // If the subscription ID doesn't match, ignore the event (no update)
              console.log('Different subscription ID, ignoring event')
            }
          }
        } catch (error) {
          await redis.del(eventKey)
          console.error('Error in subscription.created handler:', error)
        }
        break

      case 'payment_method.attached':
        try {
          const paymentMethod = event.data.object as Stripe.PaymentMethod

          // For ACH Direct Debit, bank is verified through Plaid/instant verification
          if (paymentMethod.type === 'us_bank_account') {
            await redis.set(
              `bank_account:${paymentMethod.customer}`,
              JSON.stringify({
                customerId: paymentMethod.customer,
                verified: true,
                last4: paymentMethod.us_bank_account?.last4,
                timestamp: Date.now(),
              })
            )
          }
        } catch (error) {
          await redis.del(eventKey)
          console.error('Error in payment_method.attached handler:', error)
        }
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook handler failed:', error)
    // Log the full error stack trace in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Detailed error:', {
        name: (error as Error)?.name,
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
      })
    }
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
