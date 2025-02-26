import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id

    if (!studentId) {
      console.log('❌ [STUDENT-SUBSCRIPTIONS] No student ID provided')
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    console.log(
      `🔍 [STUDENT-SUBSCRIPTIONS] Checking subscriptions for student ID: ${studentId}`
    )

    // Find the student with their payer information
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { payer: true },
    })

    if (!student) {
      console.log(`❌ [STUDENT-SUBSCRIPTIONS] Student not found: ${studentId}`)
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // If the student doesn't have a payer with a Stripe customer ID, they can't have subscriptions
    if (!student.payer?.stripeCustomerId) {
      console.log(
        `⚠️ [STUDENT-SUBSCRIPTIONS] Student has no associated payer with Stripe ID`
      )
      return NextResponse.json({
        subscriptions: [],
        message: 'Student has no associated Stripe customer',
      })
    }

    // Get subscriptions for this customer from Stripe
    console.log(
      `🔍 [STUDENT-SUBSCRIPTIONS] Checking Stripe subscriptions for customer: ${student.payer.stripeCustomerId}`
    )

    const subscriptions = await stripeServerClient.subscriptions.list({
      customer: student.payer.stripeCustomerId,
      limit: 10,
      expand: ['data.default_payment_method'],
    })

    // Filter and format subscriptions
    const formattedSubscriptions = subscriptions.data.map((subscription) => {
      // Check if this subscription is related to this student
      let isForThisStudent = false

      if (subscription.metadata?.studentIds) {
        try {
          const studentIds = JSON.parse(subscription.metadata.studentIds)
          isForThisStudent =
            Array.isArray(studentIds) && studentIds.includes(studentId)
        } catch (error) {
          console.error('Error parsing studentIds metadata:', error)
        }
      }

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(
          subscription.current_period_start * 1000
        ).toISOString(),
        currentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        created: new Date(subscription.created * 1000).toISOString(),
        isForThisStudent,
        paymentMethod: subscription.default_payment_method
          ? {
              id:
                typeof subscription.default_payment_method === 'string'
                  ? subscription.default_payment_method
                  : subscription.default_payment_method.id,
              brand:
                typeof subscription.default_payment_method !== 'string'
                  ? subscription.default_payment_method.card?.brand
                  : null,
              last4:
                typeof subscription.default_payment_method !== 'string'
                  ? subscription.default_payment_method.card?.last4
                  : null,
            }
          : null,
      }
    })

    console.log(
      `✅ [STUDENT-SUBSCRIPTIONS] Found ${formattedSubscriptions.length} subscriptions`
    )

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
      customerId: student.payer.stripeCustomerId,
    })
  } catch (error) {
    console.error(
      '❌ [STUDENT-SUBSCRIPTIONS] Error checking subscriptions:',
      error
    )
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
