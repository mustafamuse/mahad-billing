import { NextResponse } from 'next/server'

import { SubscriptionStatus } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import { AppError, ValidationError, handleStripeError } from '@/lib/errors'
import { stripeServerClient } from '@/lib/stripe'

const completeEnrollmentSchema = z.object({
  setupIntentId: z.string(),
  studentIds: z
    .array(z.string().uuid())
    .min(1, 'At least one student required'),
})

export async function POST(req: Request) {
  try {
    // 1. Parse and validate request body
    const body = await req.json()
    const { setupIntentId, studentIds } = completeEnrollmentSchema.parse(body)

    // 2. Verify SetupIntent and get stored metadata
    const setupIntent = await stripeServerClient.setupIntents.retrieve(
      setupIntentId,
      {
        expand: ['payment_method'],
      }
    )

    if (setupIntent.status !== 'succeeded') {
      throw new AppError(
        'Bank account setup not completed',
        'SETUP_NOT_COMPLETE',
        400
      )
    }

    // 3. Parse metadata
    const payorDetails = JSON.parse(setupIntent.metadata?.payorDetails || '{}')
    const storedStudentIds = JSON.parse(
      setupIntent.metadata?.studentIds || '[]'
    )

    // 4. Verify student IDs match
    if (
      JSON.stringify(studentIds.sort()) !==
      JSON.stringify(storedStudentIds.sort())
    ) {
      throw new AppError('Student selection mismatch', 'STUDENT_MISMATCH', 400)
    }

    // 5. Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 6. Verify students are still available
      const students = await tx.student.findMany({
        where: {
          id: { in: studentIds },
          payorId: null, // Only get unenrolled students
        },
        select: {
          id: true,
          name: true,
          monthlyRate: true,
          customRate: true,
          familyId: true,
        },
      })

      if (students.length !== studentIds.length) {
        throw new AppError(
          'One or more students are no longer available',
          'STUDENTS_UNAVAILABLE',
          409
        )
      }

      // 7. Create or update payor record
      let payor = await tx.payor.findFirst({
        where: { stripeCustomerId: setupIntent.customer as string },
      })

      if (!payor) {
        payor = await tx.payor.create({
          data: {
            name: `${payorDetails.firstName} ${payorDetails.lastName}`,
            email: payorDetails.email,
            phone: payorDetails.phone,
            relationship: payorDetails.relationship,
            stripeCustomerId: setupIntent.customer as string,
          },
        })
      }

      // 8. Update students with new payor
      await tx.student.updateMany({
        where: { id: { in: studentIds } },
        data: { payorId: payor.id },
      })

      // 9. Set payment method as default for customer
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id

      if (!paymentMethodId) {
        throw new AppError(
          'Invalid or missing payment method',
          'PAYMENT_METHOD_ERROR',
          400
        )
      }

      await stripeServerClient.customers.update(
        setupIntent.customer as string,
        {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        }
      )

      // Create subscription
      const subscription = await stripeServerClient.subscriptions.create({
        customer: setupIntent.customer as string,
        items: students.map((student) => ({
          price_data: {
            currency: 'usd',
            product: process.env.STRIPE_PRODUCT_ID!,
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
            unit_amount: student.monthlyRate * 100, // Convert to cents
          },
          metadata: {
            studentId: student.id,
            studentName: student.name,
            isCustomRate: student.customRate ? 'true' : 'false', // Convert boolean to string
            monthlyRate: student.monthlyRate,
          },
        })),
        payment_settings: {
          payment_method_types: ['us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
        metadata: {
          payorId: payor.id,
          studentIds: JSON.stringify(studentIds),
          totalMonthlyRate: students.reduce((sum, s) => sum + s.monthlyRate, 0),
          enrollmentDate: new Date().toISOString(),
        },
        collection_method: 'charge_automatically',
      })

      // Return success result with subscription details
      return {
        payorId: payor.id,
        studentCount: students.length,
        totalMonthlyRate: students.reduce((sum, s) => sum + s.monthlyRate, 0),
        subscriptionId: subscription.id,
        status: SubscriptionStatus.INCOMPLETE,
        students: students.map((s) => ({
          id: s.id,
          name: s.name,
          rate: s.monthlyRate,
          isCustomRate: s.customRate,
        })),
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Enrollment completion failed:', error)

    if (error instanceof z.ZodError) {
      const validationError = new ValidationError('Invalid enrollment data')
      return NextResponse.json(
        {
          success: false,
          code: validationError.code,
          errors: error.errors,
        },
        { status: validationError.statusCode }
      )
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      )
    }

    if (error instanceof stripeServerClient.errors.StripeError) {
      const stripeError = handleStripeError(error)
      return NextResponse.json(
        {
          success: false,
          code: stripeError.code,
          message: stripeError.message,
        },
        { status: stripeError.statusCode }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        code: 'ENROLLMENT_ERROR',
        message: 'Failed to complete enrollment',
      },
      { status: 500 }
    )
  }
}
