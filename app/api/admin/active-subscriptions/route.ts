import { NextResponse } from 'next/server'

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    const subscriptions = []

    // Step 1: Fetch all active subscriptions using pagination
    let hasMore = true
    let startingAfter: string | undefined = undefined
    while (hasMore) {
      const response: Stripe.Response<Stripe.ApiList<Stripe.Subscription>> =
        await stripe.subscriptions.list({
          status: 'active',
          expand: ['data.customer', 'data.items', 'data.latest_invoice'],
          limit: 100, // Stripe's max limit per page
          starting_after: startingAfter,
        })

      subscriptions.push(...response.data)
      hasMore = response.has_more
      if (hasMore) startingAfter = response.data[response.data.length - 1].id
    }

    // Step 2: Flatten subscriptions by student and calculate monthsPaid correctly
    const formattedSubscriptions = await Promise.all(
      subscriptions.flatMap(async (sub) => {
        const customer = sub.customer as Stripe.Customer
        const invoice = sub.latest_invoice as Stripe.Invoice | null

        // Fetch all invoices for this subscription
        const invoices = await stripe.invoices.list({
          subscription: sub.id,
          status: 'paid', // Only count successfully paid invoices
          limit: 100, // Adjust if needed
        })

        return sub.items.data.map((item) => {
          const studentName = item.metadata.studentName || 'Unknown'
          const monthlyRate = parseFloat(item.metadata.monthlyRate || '0')

          return {
            studentName,
            amountPaid: invoice?.amount_paid ? invoice.amount_paid / 100 : 0, // Total amount paid in the last invoice
            nextPaymentAmount: monthlyRate, // Amount for the next billing cycle
            monthsPaid: invoices.data.length, // Number of paid invoices = number of months paid
            enrollmentDate: new Date(sub.created * 1000).toLocaleString(
              'en-US',
              { timeZone: 'America/Chicago' }
            ),
            isFirstPaymentMade: invoices.data.length > 0, // First payment made if any invoices are paid
            firstPaymentDate: invoices.data.length
              ? new Date(invoices.data[0].created * 1000).toLocaleString() // Date of first paid invoice
              : 'Not yet paid',
            nextPaymentDate: new Date(
              sub.current_period_end * 1000
            ).toLocaleString('en-US', {
              timeZone: 'America/Chicago',
            }),
            subscriptionStatus: sub.status,
            payer: customer.name || customer.email || 'Unknown', // The customer/payer
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      data: formattedSubscriptions.flat(),
    })
  } catch (error) {
    console.error('Error retrieving active subscriptions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve active subscriptions.' },
      { status: 500 }
    )
  }
}
