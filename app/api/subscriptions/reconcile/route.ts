import { NextResponse } from 'next/server'

import Stripe from 'stripe'
import { z } from 'zod'

import { prisma } from '@/lib/db'

const reconcileSchema = z.object({
  studentId: z.string(),
  subscriptionId: z.string(),
})

const stripeLiveClient = new Stripe(process.env.STRIPE_LIVE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { studentId, subscriptionId } = reconcileSchema.parse(body)

    // Find the student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { payer: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get the subscription from Stripe to get customer details
    const stripeSubscription = await stripeLiveClient.subscriptions.retrieve(
      subscriptionId,
      {
        expand: ['customer'],
      }
    )

    const customer = stripeSubscription.customer as Stripe.Customer
    if (!customer?.email) {
      return NextResponse.json(
        { error: 'Invalid customer data from Stripe' },
        { status: 400 }
      )
    }

    // If student doesn't have a payer, create one
    let payerId = student.payer?.id
    if (!payerId) {
      const newPayer = await prisma.payer.create({
        data: {
          name: student.name,
          email: customer.email,
          relationship: 'self',
          phone: student.phone || 'Not provided',
          stripeCustomerId: customer.id,
          students: {
            connect: { id: student.id },
          },
        },
      })
      payerId = newPayer.id
    }

    // Create or update the subscription
    const dbSubscription = await prisma.subscription.upsert({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
      create: {
        stripeSubscriptionId: subscriptionId,
        status: 'ACTIVE',
        payerId: payerId,
      },
      update: {
        payerId: payerId,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json({ success: true, subscription: dbSubscription })
  } catch (error) {
    console.error('Error reconciling subscription:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
