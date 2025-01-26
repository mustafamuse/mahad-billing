import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { stripeServerClient } from '@/lib/utils/stripe'

interface _PaymentStatus {
  status:
    | 'requires_payment_method' // Initial state
    | 'requires_confirmation' // After bank account linked
    | 'processing' // ACH transfer initiated
    | 'succeeded' // Money received
    | 'requires_action' // Needs micro-deposits verification
    | 'canceled' // Payment canceled
    | 'failed' // Payment failed
  amount: number
  customerName: string
  studentNames: string[]
  lastError?: string
  nextRetry?: string
  created: number
}

export async function GET() {
  try {
    const paymentIntents = await stripeServerClient.paymentIntents.list({
      limit: 10,
      expand: ['data.customer', 'data.last_payment_error'],
    })

    const payments = paymentIntents.data.map((pi) => ({
      status: pi.status,
      amount: pi.amount / 100,
      customerName: (pi.customer as Stripe.Customer)?.name || 'Unknown',
      studentNames: JSON.parse((pi.metadata?.students as string) || '[]').map(
        (s: any) => s.name
      ),
      lastError: pi.last_payment_error?.message,
      created: pi.created,
      // ACH typically takes 5-7 business days
      estimatedArrival:
        pi.status === 'processing'
          ? new Date(
              pi.created * 1000 + 7 * 24 * 60 * 60 * 1000
            ).toLocaleDateString()
          : undefined,
    }))

    // Sort by creation date, newest first
    return NextResponse.json(payments.sort((a, b) => b.created - a.created))
  } catch (error) {
    console.error('Error fetching payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    )
  }
}
