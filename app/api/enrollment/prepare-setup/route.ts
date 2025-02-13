import { NextResponse } from 'next/server'

import { Prisma, SubscriptionStatus } from '@prisma/client'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import {
  AppError,
  Errors,
  ValidationError,
  handleStripeError,
} from '@/lib/errors'
import { validateStudentForEnrollment } from '@/lib/queries/subscriptions'
import { prepareSetupSchema } from '@/lib/schemas/enrollment'
import { stripeServerClient } from '@/lib/stripe'

const ACTIVE_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
]

// Type for Payer with included subscriptions and students
type PayerWithDetails = Prisma.PayerGetPayload<{
  include: {
    subscriptions: {
      where: {
        status: {
          in: SubscriptionStatus[]
        }
      }
    }
    students: true
  }
}>

export async function POST(req: Request) {
  try {
    // 1. Parse and validate request body
    const body = await req.json()
    const data = prepareSetupSchema.parse(body)

    // 2. Start a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 3. Validate each student individually
      const validationPromises = data.studentIds.map((studentId) =>
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

      // 4. Get students with family info for metadata
      const students = await tx.student.findMany({
        where: { id: { in: data.studentIds } },
        include: { siblingGroup: true },
      })

      // Calculate total monthly rate
      const totalMonthlyRate = students.reduce(
        (sum, student) => sum + student.monthlyRate,
        0
      )

      // Group students by family
      const siblingGroups = students.reduce(
        (acc, student) => {
          if (student.siblingGroup) {
            if (!acc[student.siblingGroup.id]) {
              acc[student.siblingGroup.id] = []
            }
            acc[student.siblingGroup.id].push(student)
          }
          return acc
        },
        {} as Record<string, typeof students>
      )

      // 5. Check for existing payer
      const existingPayer = (await tx.payer.findFirst({
        where: {
          OR: [{ email: data.email }, { phone: data.phone }],
        },
        include: {
          subscriptions: {
            where: {
              status: {
                in: ACTIVE_SUBSCRIPTION_STATUSES,
              },
            },
          },
          students: true,
        },
      })) as PayerWithDetails | null

      let customerId: string

      if (existingPayer?.stripeCustomerId) {
        try {
          // 6a. Update existing Stripe customer
          const customer = await stripeServerClient.customers.update(
            existingPayer.stripeCustomerId,
            {
              name: `${data.firstName} ${data.lastName}`,
              email: data.email,
              phone: data.phone,
              metadata: {
                relationship: data.relationship,
                totalStudents: existingPayer.students.length.toString(),
                hasActiveSubscription:
                  existingPayer.subscriptions.length > 0 ? 'true' : 'false',
                updatedAt: new Date().toISOString(),
              },
            }
          )
          customerId = customer.id

          // Check if payer has any active subscriptions
          if (existingPayer.subscriptions.length > 0) {
            throw new AppError(
              'Payer already has active subscriptions',
              'ACTIVE_SUBSCRIPTION_EXISTS',
              409
            )
          }
        } catch (err: any) {
          if (err?.raw?.code === 'resource_missing') {
            // Customer doesn't exist in Stripe anymore, create a new one
            const customer = await stripeServerClient.customers.create({
              name: `${data.firstName} ${data.lastName}`,
              email: data.email,
              phone: data.phone,
              metadata: {
                relationship: data.relationship,
                enrollmentPending: 'true',
                totalStudents: data.studentIds.length.toString(),
                totalMonthlyRate: totalMonthlyRate.toString(),
                createdAt: new Date().toISOString(),
              },
            })
            customerId = customer.id

            // Update the payer record with the new Stripe customer ID
            await tx.payer.update({
              where: { email: data.email },
              data: { stripeCustomerId: customerId },
            })
          } else {
            throw err // Re-throw if it's a different error
          }
        }
      } else {
        // 6b. Create new Stripe customer
        const customer = await stripeServerClient.customers.create({
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          metadata: {
            relationship: data.relationship,
            enrollmentPending: 'true',
            totalStudents: data.studentIds.length.toString(),
            totalMonthlyRate: totalMonthlyRate.toString(),
            createdAt: new Date().toISOString(),
          },
        })
        customerId = customer.id
      }

      // 7. Create SetupIntent with enhanced metadata
      const setupIntent = await stripeServerClient.setupIntents.create({
        customer: customerId,
        payment_method_types: ['us_bank_account'],
        usage: 'off_session',
        metadata: {
          payerDetails: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            relationship: data.relationship,
          }),
          studentIds: JSON.stringify(data.studentIds),
          studentDetails: JSON.stringify(
            students.map((s) => ({
              id: s.id,
              name: s.name,
              rate: s.monthlyRate,
              familyId: s.siblingGroup?.id,
            }))
          ),
          totalStudents: data.studentIds.length.toString(),
          totalMonthlyRate: totalMonthlyRate.toString(),
          siblingGroupCount: Object.keys(siblingGroups).length.toString(),
          createdAt: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        },
        payment_method_options: {
          us_bank_account: {
            verification_method: 'automatic',
            financial_connections: {
              permissions: ['payment_method'],
            },
          },
        },
      })

      // Only return serializable data
      return {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        customerId,
        isExistingCustomer: !!existingPayer,
        status: setupIntent.status,
        paymentMethodTypes: setupIntent.payment_method_types,
        totalMonthlyRate,
        siblingGroupCount: Object.keys(siblingGroups).length,
      }
    })

    // 8. Return success response with enhanced data
    return NextResponse.json({
      success: true,
      ...result,
      message: result.isExistingCustomer
        ? 'Existing customer setup prepared'
        : 'New customer setup prepared',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Setup preparation failed:', error)

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

    const genericError = Errors.enrollment()
    return NextResponse.json(
      {
        success: false,
        code: genericError.code,
        message: genericError.message,
        timestamp: new Date().toISOString(),
      },
      { status: genericError.statusCode }
    )
  }
}
