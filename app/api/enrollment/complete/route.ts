import { NextResponse } from 'next/server'

import { z } from 'zod'

import { prisma } from '@/lib/db'
import { AppError, ValidationError, handleStripeError } from '@/lib/errors'
import { validateStudentForEnrollment } from '@/lib/queries/subscriptions'
import { stripeServerClient } from '@/lib/stripe'
import { StudentStatus } from '@/lib/types/student'

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
    const payerDetails = JSON.parse(setupIntent.metadata?.payerDetails || '{}')
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
      // 6. Validate each student
      const validationPromises = studentIds.map((studentId) =>
        validateStudentForEnrollment(studentId)
      )
      const validationResults = await Promise.allSettled(validationPromises)

      // Check for validation failures
      const failures = validationResults.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )

      if (failures.length > 0) {
        throw new AppError(
          `Student validation failed: ${failures[0].reason.message}`,
          'STUDENT_VALIDATION_FAILED',
          400
        )
      }

      // Get validated student details
      const validatedStudents = validationResults.map(
        (result) => (result as PromiseFulfilledResult<any>).value.student
      )

      // 7. Create or update payer record
      let payer = await tx.payer.findFirst({
        where: { stripeCustomerId: setupIntent.customer as string },
      })

      if (!payer) {
        payer = await tx.payer.create({
          data: {
            name: `${payerDetails.firstName} ${payerDetails.lastName}`,
            email: payerDetails.email,
            phone: payerDetails.phone,
            stripeCustomerId: setupIntent.customer as string,
            isActive: true,
          },
        })
      }

      // 8. Update students with new payer and status
      await tx.student.updateMany({
        where: { id: { in: studentIds } },
        data: {
          payerId: payer.id,
          status: StudentStatus.ENROLLED,
          updatedAt: new Date(),
        },
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

      // Create subscription in Stripe (but let webhook handle the database record)
      await stripeServerClient.subscriptions.create({
        customer: setupIntent.customer as string,
        items: validatedStudents.map((student) => ({
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
            isCustomRate: student.hasCustomRate ? 'true' : 'false',
            monthlyRate: student.monthlyRate,
            discountApplied: student.discountApplied || 0,
            familyId: student.familyId || '',
          },
        })),
        payment_settings: {
          payment_method_types: ['us_bank_account'],
          save_default_payment_method: 'on_subscription',
        },
        metadata: {
          payerId: payer.id,
          studentIds: JSON.stringify(studentIds),
          totalMonthlyRate: validatedStudents.reduce(
            (sum, s) => sum + s.monthlyRate,
            0
          ),
          enrollmentDate: new Date().toISOString(),
          totalStudents: validatedStudents.length.toString(),
          hasFamilyDiscount: validatedStudents.some((s) => s.familyId)
            ? 'true'
            : 'false',
          setupIntentId: setupIntentId, // Add this for tracking
          environment: process.env.NODE_ENV,
          version: '2.0.0',
        },
        collection_method: 'charge_automatically',
      })

      // Return success result with enhanced details
      return {
        payerId: payer.id,
        studentCount: validatedStudents.length,
        totalMonthlyRate: validatedStudents.reduce(
          (sum, s) => sum + s.monthlyRate,
          0
        ),
        students: validatedStudents.map((s) => ({
          id: s.id,
          name: s.name,
          rate: s.monthlyRate,
          isCustomRate: s.hasCustomRate,
          discountApplied: s.discountApplied,
          familyId: s.familyId,
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
