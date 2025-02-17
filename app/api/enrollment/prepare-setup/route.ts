import { NextResponse } from 'next/server'

import { SubscriptionStatus } from '@prisma/client'
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

// const ACTIVE_SUBSCRIPTION_STATUSES = [
//   SubscriptionStatus.ACTIVE,
//   SubscriptionStatus.PAST_DUE,
// ]

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('💡 Request Body:', body)

    const data = prepareSetupSchema.parse(body)
    console.log('✅ Validated Data:', {
      email: data.payerDetails.email,
      studentIds: data.studentIds,
    })

    const result = await prisma.$transaction(async (tx) => {
      // Log student details
      const studentCheck = await tx.student.findFirst({
        where: { id: data.studentIds[0] },
        include: {
          payer: {
            include: {
              subscriptions: {
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      })
      console.log('👨‍🎓 Student Details:', {
        id: studentCheck?.id,
        name: studentCheck?.name,
        payerId: studentCheck?.payerId,
        payerEmail: studentCheck?.payer?.email,
        subscriptions: studentCheck?.payer?.subscriptions,
      })

      // Log ALL payer checks
      console.log('🔍 Starting Payer Checks...')

      const simplePayerCheck = await tx.payer.findFirst({
        where: { email: data.payerDetails.email },
        select: { id: true, email: true },
      })
      console.log('1️⃣ Simple Payer Check:', simplePayerCheck)

      const payerWithSubs = await tx.payer.findFirst({
        where: { email: data.payerDetails.email },
        include: {
          subscriptions: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
      })
      console.log('2️⃣ Payer with Subscriptions:', payerWithSubs)

      // Check for existing payer with active subscriptions
      const existingPayer = await tx.payer.findFirst({
        where: {
          email: data.payerDetails.email,
          subscriptions: {
            some: {
              status: SubscriptionStatus.ACTIVE,
            },
          },
        },
        include: {
          subscriptions: true,
          students: true,
        },
      })

      if (existingPayer) {
        throw new AppError(
          'Payer already has active subscriptions',
          'ACTIVE_SUBSCRIPTION_EXISTS',
          400
        )
      }

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

      // Create or update Stripe customer
      const customer = await stripeServerClient.customers.create({
        name: `${data.payerDetails.firstName} ${data.payerDetails.lastName}`,
        email: data.payerDetails.email,
        phone: data.payerDetails.phone,
        metadata: {
          relationship: data.payerDetails.relationship,
          enrollmentPending: 'true',
          totalStudents: data.studentIds.length.toString(),
          totalMonthlyRate: totalMonthlyRate.toString(),
          createdAt: new Date().toISOString(),
        },
      })

      // Create SetupIntent
      const setupIntent = await stripeServerClient.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['us_bank_account'],
        usage: 'off_session',
        metadata: {
          payerDetails: JSON.stringify(data.payerDetails),
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

      return {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
        customerId: customer.id,
        isExistingCustomer: false,
        status: setupIntent.status,
        paymentMethodTypes: setupIntent.payment_method_types,
        totalMonthlyRate,
        siblingGroupCount: Object.keys(siblingGroups).length,
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
      message: 'New customer setup prepared',
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
