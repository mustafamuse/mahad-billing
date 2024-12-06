// /api/webhook.js

import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'
import { Student, PaymentNotification } from '@/lib/types'
import { calculateStudentPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Add detailed logging helper
function logPaymentEvent(type: string, data: any) {
  console.log(`[${new Date().toISOString()}] Payment Event:`, {
    type,
    ...data,
  })
}

export async function POST(request: Request) {
  console.log('Webhook handler invoked')
  try {
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
      console.log(`Received event: ${event.type}`)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    if (event.type === 'setup_intent.succeeded') {
      console.log('Handling setup_intent.succeeded event')
      const setupIntent = event.data.object as Stripe.SetupIntent
      const customerId = setupIntent.customer as string

      // Type-safe metadata access for both total and students
      const metadata = setupIntent.metadata as {
        total?: string
        students?: string
      } | null

      // Parse students from metadata
      const students = metadata?.students
        ? (JSON.parse(metadata.students) as Student[])
        : []
      console.log('Students from metadata:', students)

      // Create subscription items for each student
      const subscriptionItems = students.map((student: Student) => {
        // Log student data before calculation
        console.log('Processing student:', student)

        const { price, discount, isSiblingDiscount } =
          calculateStudentPrice(student)
        console.log('Calculated price:', { price, discount, isSiblingDiscount })

        return {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(price * 100), // Ensure integer with Math.round
            recurring: { interval: 'month' as const },
            product: process.env.STRIPE_PRODUCT_ID!,
          },
          metadata: {
            studentId: student.id,
            studentName: student.name,
            discount: discount.toString(),
            isSiblingDiscount: isSiblingDiscount.toString(),
          },
        }
      })

      // Create subscription with multiple items
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: subscriptionItems,
        payment_settings: {
          payment_method_types: ['us_bank_account'],
          save_default_payment_method: 'on_subscription',
          payment_method_options: {
            us_bank_account: {
              financial_connections: { permissions: ['payment_method'] },
            },
          },
        },
        metadata: metadata || {},
        collection_method: 'charge_automatically',
        payment_behavior: 'default_incomplete',
        billing_cycle_anchor: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1,
      })

      console.log('Subscription created:', subscription.id)
    } else if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice

      // Get subscription and customer details
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription as string
      )
      const customer = (await stripe.customers.retrieve(
        invoice.customer as string
      )) as Stripe.Customer

      // Track retry status
      const attemptCount = invoice.attempt_count || 0
      const hasMoreRetries = invoice.next_payment_attempt !== null
      const nextAttemptDate = invoice.next_payment_attempt || undefined

      // Enhanced logging
      logPaymentEvent('payment_failed', {
        subscriptionId: subscription.id,
        customerId: customer.id,
        customerName: customer.name,
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        attemptCount,
        hasMoreRetries,
        nextAttemptDate: nextAttemptDate
          ? new Date(nextAttemptDate * 1000)
          : 'No more retries',
        paymentIntent: invoice.payment_intent,
        failureCode: invoice.last_finalization_error?.code,
        failureMessage: invoice.last_finalization_error?.message,
        students: JSON.parse(subscription.metadata?.students || '[]'),
      })

      // Store notification for admin dashboard
      const notification: PaymentNotification = {
        type: 'payment_failed',
        subscriptionId: subscription.id,
        customerId: customer.id,
        customerName: customer.name || 'Unknown',
        studentNames: JSON.parse(subscription.metadata?.students || '[]').map(
          (s: Student) => s.name
        ),
        amount: invoice.amount_due,
        attemptCount,
        nextAttempt: nextAttemptDate,
        timestamp: Date.now(),
      }

      await redis.lpush('payment_notifications', JSON.stringify(notification))

      // After 3 retries (or if no more retries scheduled)
      if (!hasMoreRetries) {
        logPaymentEvent('final_retry_failed', {
          subscriptionId: subscription.id,
          customerId: customer.id,
          totalAttempts: attemptCount,
          totalAmount: invoice.amount_due,
          nextAction: 'marking_subscription_past_due',
        })

        // Update subscription to past_due state
        await stripe.subscriptions.update(subscription.id, {
          payment_behavior: 'error_if_incomplete',
          collection_method: 'charge_automatically',
        })

        // Store final failure notification
        await redis.lpush(
          'payment_notifications',
          JSON.stringify({
            ...notification,
            type: 'payment_failed',
            attemptCount: 3,
            nextAttempt: undefined,
            timestamp: Date.now(),
          })
        )
      }
    } else if (event.type === 'payment_intent.requires_action') {
      // Handle micro-deposits verification if needed
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('Payment requires action:', paymentIntent.id)
    } else if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      logPaymentEvent('payment_succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        paymentMethod: paymentIntent.payment_method,
        invoiceId: paymentIntent.invoice,
      })
    } else if (event.type === 'customer.created') {
      console.log('Customer created via webhook:', {
        customerId: (event.data.object as Stripe.Customer).id,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
