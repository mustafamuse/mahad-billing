import { NextResponse } from 'next/server'

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    const { subscriptionId } = await request.json()

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const invoice = await stripe.invoices.retrieve(
      subscription.latest_invoice as string
    )

    if (invoice.status !== 'paid') {
      // Create a new PaymentIntent for the failed invoice
      const paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.amount_due,
        currency: invoice.currency,
        customer: invoice.customer as string,
        payment_method: subscription.default_payment_method as string,
        off_session: true,
        confirm: true,
        payment_method_types: ['us_bank_account'],
        mandate_data: {
          customer_acceptance: {
            type: 'online',
            online: {
              ip_address:
                request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                '',
              user_agent: request.headers.get('user-agent') || '',
            },
          },
        },
      })

      // Update invoice with payment method
      await stripe.invoices.pay(invoice.id, {
        payment_method: subscription.default_payment_method as string,
      })

      return NextResponse.json({ success: true, paymentIntent })
    }

    return NextResponse.json(
      { error: 'Invoice is already paid' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error retrying payment:', error)
    return NextResponse.json(
      { error: 'Failed to retry payment' },
      { status: 500 }
    )
  }
}
