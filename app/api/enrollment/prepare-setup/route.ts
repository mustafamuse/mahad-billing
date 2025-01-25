import { NextResponse } from 'next/server'

import { z } from 'zod'

import { prisma } from '@/lib/db'
import {
  AppError,
  Errors,
  ValidationError,
  handleStripeError,
} from '@/lib/errors'
import { prepareSetupSchema } from '@/lib/schemas/enrollment'
import { stripeServerClient } from '@/lib/utils/stripe'

export async function POST(req: Request) {
  try {
    // 1. Parse and validate request body
    const body = await req.json()
    const data = prepareSetupSchema.parse(body)

    // 2. Start a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 3. Verify students are still available
      const students = await tx.student.count({
        where: {
          id: { in: data.studentIds },
          payorId: null, // Only count unenrolled students
        },
      })

      if (students !== data.studentIds.length) {
        throw new Error('One or more students are no longer available')
      }

      // 4. Check for existing payor
      const existingPayor = await tx.payor.findFirst({
        where: {
          OR: [{ email: data.email }, { phone: data.phone }],
        },
        select: {
          stripeCustomerId: true,
        },
      })

      let customerId: string

      if (existingPayor?.stripeCustomerId) {
        // 5a. Update existing Stripe customer
        const customer = await stripeServerClient.customers.update(
          existingPayor.stripeCustomerId,
          {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            metadata: {
              relationship: data.relationship,
              updatedAt: new Date().toISOString(),
            },
          }
        )
        customerId = customer.id
      } else {
        // 5b. Create new Stripe customer
        const customer = await stripeServerClient.customers.create({
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          metadata: {
            relationship: data.relationship,
            enrollmentPending: 'true',
            createdAt: new Date().toISOString(),
          },
        })
        customerId = customer.id
      }

      // 6. Create SetupIntent
      const setupIntent = await stripeServerClient.setupIntents.create({
        customer: customerId,
        payment_method_types: ['us_bank_account'],
        usage: 'off_session',
        metadata: {
          payorDetails: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            relationship: data.relationship,
          }),
          studentIds: JSON.stringify(data.studentIds),
          createdAt: new Date().toISOString(),
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
        isExistingCustomer: !!existingPayor,
      }
    })

    // 7. Return success response
    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    // 8. Error handling
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

    if (error instanceof Error) {
      if (error.message === 'One or more students are no longer available') {
        const conflictError = new AppError(
          error.message,
          'STUDENTS_UNAVAILABLE',
          409
        )
        return NextResponse.json(
          {
            success: false,
            code: conflictError.code,
            message: conflictError.message,
          },
          { status: conflictError.statusCode }
        )
      }
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
      },
      { status: genericError.statusCode }
    )
  }
}
