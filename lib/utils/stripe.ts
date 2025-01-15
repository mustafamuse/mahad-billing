import Stripe from 'stripe'

import { redis } from '../redis'

// Initialize configured server-side Stripe client
export const stripeServerClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Utility: Verify payment setup and bank account
export async function verifyPaymentSetup(customerId: string) {
  console.log('🔍 Verifying payment setup for customer:', customerId)

  // Check if payment setup exists in Redis
  const paymentSetup = await redis.get(`payment_setup:${customerId}`)
  if (!paymentSetup) {
    console.warn('⚠️ No payment setup found for customer:', customerId)
    return false
  }

  // Check if bank account exists in Redis
  const bankAccount = await redis.get(`bank_account:${customerId}`)
  if (!bankAccount) {
    console.warn('⚠️ No bank account found for customer:', customerId)
    return false
  }

  console.log('✅ Payment setup verified for customer:', customerId)
  return true
}

// Utility: Extract IDs from Stripe event
export function extractIdsFromEvent(event: Stripe.Event) {
  let subscriptionId: string | undefined
  let customerId: string | undefined

  // Handle different event types
  switch (event.type) {
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      const invoice = event.data.object as Stripe.Invoice
      subscriptionId = invoice.subscription as string
      customerId = invoice.customer as string
      break

    case 'payment_method.attached':
    case 'payment_method.detached':
      const paymentMethod = event.data.object as Stripe.PaymentMethod
      customerId = paymentMethod.customer as string
      break

    default:
      console.log('⚠️ Unhandled event type:', event.type)
  }

  return { subscriptionId, customerId }
}

// Utility: Log Stripe event
export function logEvent(action: string, eventId: string, details: object) {
  console.log(`🔔 ${action}:`, {
    eventId,
    timestamp: new Date().toISOString(),
    ...details,
  })
}

// Utility: Handle Stripe error
export function handleError(action: string, eventId: string, error: unknown) {
  console.error(`❌ ${action} failed:`, {
    eventId,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  })

  // Re-throw error for Stripe to retry webhook
  throw error
}
