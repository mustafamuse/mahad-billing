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

    switch (event.type) {
      case 'setup_intent.succeeded':
        try {
          const setupIntent = event.data.object as Stripe.SetupIntent

          // Initial setup status
          await redis.set(
            `payment_setup:${setupIntent.customer}`,
            JSON.stringify({
              customerId: setupIntent.customer,
              subscriptionId: null,
              setupCompleted: true,
              bankVerified: true,
              subscriptionActive: false,
              timestamp: Date.now(),
            })
          )

          // Parse students from metadata
          const students = JSON.parse(setupIntent.metadata?.students || '[]')

          // Get Unix timestamp for 1st of next month
          const now = new Date()
          const firstOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
          )
          const billingAnchor = Math.floor(firstOfNextMonth.getTime() / 1000)

          // Create subscription with dynamic prices for each student
          const subscription = await stripe.subscriptions.create({
            customer: setupIntent.customer as string,
            default_payment_method: setupIntent.payment_method as string,
            items: students.map((student: Student) => ({
              price_data: {
                currency: 'usd',
                unit_amount: student.monthlyRate * 100, // Use pre-calculated rate
                recurring: { interval: 'month' },
                product: process.env.STRIPE_PRODUCT_ID!,
              },
              quantity: 1,
              metadata: {
                studentId: student.id,
                studentName: student.name,
                familyId: student.familyId || null,
                baseRate: BASE_RATE,
                monthlyRate: student.monthlyRate,
                discount: BASE_RATE - student.monthlyRate,
              },
            })),
            billing_cycle_anchor: billingAnchor,
            proration_behavior: 'none',
            metadata: setupIntent.metadata,
            collection_method: 'charge_automatically',
            payment_settings: {
              payment_method_types: ['us_bank_account'],
              save_default_payment_method: 'on_subscription',
            },
          })

          logPaymentEvent('subscription_created', {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer,
            startDate: new Date(subscription.billing_cycle_anchor * 1000),
            items: subscription.items.data.map((item) => ({
              studentName: item.metadata.studentName,
              monthlyRate: item.metadata.calculatedRate,
            })),
          })
        } catch (error) {
          console.error('Error in setup_intent.succeeded handler:', error)
          const failedSetupIntent = event.data.object as Stripe.SetupIntent
          logPaymentEvent('subscription_creation_failed', {
            error: (error as Error).message,
            customer: failedSetupIntent.customer,
            setupIntentId: failedSetupIntent.id,
          })
        }
        break

      case 'customer.subscription.created':
        try {
          const subscription = event.data.object as Stripe.Subscription

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
        } catch (error) {
          console.error('Error in subscription.created handler:', error)
        }
        break

      case 'invoice.created':
        // First invoice created
        const invoice = event.data.object as Stripe.Invoice
        console.log('Invoice created:', {
          status: invoice.status,
          amount: invoice.amount_due,
          dueDate: invoice.due_date
            ? new Date(invoice.due_date * 1000)
            : undefined,
        })
        break

      case 'payment_intent.created':
        // ACH debit initiated
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('ACH debit initiated:', {
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          estimatedArrival: '5-7 business days',
        })
        break

      case 'payment_intent.processing':
        // ACH debit in progress
        console.log('ACH processing - funds being transferred')
        break

      case 'payment_intent.succeeded':
        // Payment successful
        console.log('Payment successful - subscription will activate')
        break

      case 'customer.subscription.updated':
        // Subscription becomes active
        const updatedSub = event.data.object as Stripe.Subscription
        console.log('Subscription updated:', {
          oldStatus: event.data.previous_attributes?.status,
          newStatus: updatedSub.status,
        })
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
          console.error('Error in payment_method.attached handler:', error)
        }
        break

      case 'financial_connections.account.created':
        const newFcAccount = event.data
          .object as Stripe.FinancialConnections.Account
        logPaymentEvent(
          'financial_connections.account.created',
          {
            id: newFcAccount.id,
            institution: newFcAccount.institution_name,
            category: newFcAccount.category,
            last4: newFcAccount.last4,
            permissions: newFcAccount.permissions,
          },
          'New financial connection established'
        )
        break

      case 'financial_connections.account.refreshed_balance':
        const fcAccount = event.data
          .object as Stripe.FinancialConnections.Account

        if (fcAccount.balance_refresh?.status === 'succeeded') {
          try {
            const balanceResponse =
              await stripe.financialConnections.accounts.retrieve(fcAccount.id)
            const availableBalance =
              balanceResponse?.balance?.cash?.available?.usd || 0
            const customerId = (fcAccount.account_holder as any)?.customer

            // Get customer to check required amount
            const customer = await stripe.customers.retrieve(customerId)
            const total = Number(
              (customer as Stripe.Customer).metadata?.total || 0
            )

            // Create notification if balance is insufficient
            if (availableBalance < total * 100) {
              // Get customer's subscription
              const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                limit: 1,
              })

              const notification: PaymentNotification = {
                type: 'insufficient_funds_warning',
                customerId,
                customerName: (customer as Stripe.Customer).name || 'Unknown',
                amount: total,
                timestamp: Date.now(),
                balance: availableBalance / 100,
                studentNames: JSON.parse(
                  (customer as Stripe.Customer).metadata?.students || '[]'
                ).map((s: any) => s.name),
                subscriptionId: subscriptions.data[0]?.id || 'pending',
              }
              await redis.lpush(
                'payment_notifications',
                JSON.stringify(notification)
              )

              logPaymentEvent('insufficient_funds_detected', {
                customer: customerId,
                required: total,
                available: availableBalance / 100,
              })
            }
          } catch (error) {
            console.error('Error checking balance:', error)
          }
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
