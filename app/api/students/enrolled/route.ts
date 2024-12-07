import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { parseStudentMetadata } from '@/lib/utils/parse-students'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    // Get all relevant subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'all', // Get all to track payment status
      expand: [
        'data.customer',
        'data.latest_invoice',
        'data.latest_invoice.payment_intent',
      ],
    })

    // Track students with their payment status
    const enrolledStudents = new Map()

    subscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata || {}
      const students = parseStudentMetadata(metadata.students)
      const invoice = subscription.latest_invoice as Stripe.Invoice
      const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent

      students.forEach((student) => {
        // Find the subscription item for this student
        const subscriptionItem = subscription.items.data.find(
          (item) => item.metadata?.studentId === student.id
        )

        const paymentStatus = {
          studentId: student.id,
          studentName: student.name,
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          payerName: (subscription.customer as Stripe.Customer).name,
          monthlyRate: subscriptionItem?.price.unit_amount
            ? subscriptionItem.price.unit_amount / 100
            : student.monthlyRate || 0,
          lastPayment: subscription.current_period_start * 1000,
          nextPayment: subscription.current_period_end * 1000,
          paymentStatus: paymentIntent?.status || 'unknown',
          lastPaymentError: paymentIntent?.last_payment_error?.message,
        }

        enrolledStudents.set(student.id, paymentStatus)
      })
    })

    return NextResponse.json({
      students: Array.from(enrolledStudents.values()),
      total: enrolledStudents.size,
    })
  } catch (error) {
    console.error('Error fetching enrolled students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrolled students' },
      { status: 500 }
    )
  }
}
