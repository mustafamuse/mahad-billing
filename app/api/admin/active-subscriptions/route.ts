import { NextResponse } from 'next/server'

import type { Stripe } from 'stripe'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'

interface StripeSubscription extends Stripe.Response<Stripe.Subscription> {
  current_period_end: number
}

export async function GET() {
  try {
    // Get all active subscriptions from our database
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    // Get corresponding Stripe subscriptions
    const subscriptionDetails = await Promise.all(
      activeSubscriptions.map(async (sub) => {
        try {
          const stripeSub = (await stripeServerClient.subscriptions.retrieve(
            sub.stripeSubscriptionId
          )) as StripeSubscription

          // Get latest invoice with expanded payment intent
          const latestInvoice = (await stripeServerClient.invoices.retrieve(
            stripeSub.latest_invoice as string,
            {
              expand: ['payment_intent'],
            }
          )) as Stripe.Response<
            Stripe.Invoice & {
              payment_intent: Stripe.PaymentIntent
            }
          >

          // Get the first student associated with this payer
          const student = sub.payer.students[0]

          return {
            id: sub.id,
            stripeId: sub.stripeSubscriptionId,
            studentName: student?.name || 'Unknown',
            payerName: sub.payer.name || 'Unknown',
            payerEmail: sub.payer.email || 'Unknown',
            amount: stripeSub.items.data[0].price?.unit_amount
              ? stripeSub.items.data[0].price.unit_amount / 100
              : 0,
            status: stripeSub.status,
            lastPaymentStatus: latestInvoice.payment_intent
              ? latestInvoice.payment_intent.status === 'succeeded'
                ? 'Paid'
                : 'Failed'
              : 'Not yet paid',
            nextPaymentDate: stripeSub.current_period_end
              ? new Date(stripeSub.current_period_end * 1000).toLocaleString(
                  'en-US',
                  {
                    timeZone: 'America/Chicago',
                  }
                )
              : 'No upcoming payment',
            lastPaymentDate:
              latestInvoice.status === 'paid'
                ? new Date(
                    latestInvoice.status_transitions.paid_at! * 1000
                  ).toLocaleString('en-US', {
                    timeZone: 'America/Chicago',
                  })
                : 'Not paid',
          }
        } catch (error) {
          console.error(
            `Failed to get details for subscription ${sub.stripeSubscriptionId}:`,
            error
          )
          return null
        }
      })
    )

    // Filter out any failed retrievals
    const validSubscriptions = subscriptionDetails.filter(
      (sub): sub is NonNullable<typeof sub> => sub !== null
    )

    return NextResponse.json(validSubscriptions)
  } catch (error) {
    console.error('Failed to fetch active subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active subscriptions' },
      { status: 500 }
    )
  }
}
