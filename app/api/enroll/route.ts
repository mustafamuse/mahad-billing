import { NextResponse } from 'next/server'

import { Stripe } from 'stripe'

import { createEnrollment, cleanupEnrollmentRecords } from '@/lib/db/enrollment'
import { AppError, Errors, handleStripeError } from '@/lib/errors'
import { EnrollmentApiSchema } from '@/lib/schemas/enrollment'
import { stripeServerClient } from '@/lib/utils/stripe'

interface CustomerData {
  name: string
  phone: string
  metadata: Record<string, string>
}

interface EnrollmentResponse {
  clientSecret: string
  customerId: string
  setupIntent: Stripe.SetupIntent
  enrollment: {
    payorId: string
    studentIds: string[]
  }
}

// Helper to handle errors consistently
function handleError(error: unknown): NextResponse {
  console.error('Error in enrollment:', error)

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  return NextResponse.json(
    { error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  )
}

// Create or update Stripe customer with better error handling
async function createCustomer(email: string, customerData: CustomerData) {
  try {
    let customer = (
      await stripeServerClient.customers.list({ email, limit: 1 })
    ).data[0]

    if (!customer) {
      customer = await stripeServerClient.customers.create({
        email,
        ...customerData,
      })
      console.log('✅ New Stripe customer created:', { id: customer.id, email })
    } else {
      customer = await stripeServerClient.customers.update(
        customer.id,
        customerData
      )
      console.log('✅ Existing Stripe customer updated:', {
        id: customer.id,
        email,
      })
    }

    return customer
  } catch (error) {
    console.error(`❌ Customer operation failed:`, error)
    if (error instanceof Stripe.errors.StripeError) {
      throw handleStripeError(error)
    }
    throw Errors.stripeCustomer()
  }
}

// Create SetupIntent for bank account connection
async function createSetupIntent(
  customerId: string,
  metadata: Record<string, string>
): Promise<Stripe.SetupIntent> {
  return await stripeServerClient.setupIntents.create({
    customer: customerId,
    payment_method_types: ['us_bank_account'],
    payment_method_options: {
      us_bank_account: {
        verification_method: 'automatic',
        financial_connections: {
          permissions: ['payment_method'],
        },
      },
    },
    metadata,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 1. Validate request body
    const result = EnrollmentApiSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: result.error.issues,
        },
        { status: 400 }
      )
    }

    const {
      email,
      firstName,
      lastName,
      phone,
      relationship,
      total,
      studentIds,
    } = result.data

    // 2. Create/Update Stripe Customer
    const customerData: CustomerData = {
      name: `${firstName} ${lastName}`,
      phone,
      metadata: {
        totalAmount: total.toString(),
      },
    }
    const customer = await createCustomer(email, customerData)

    // 3. Create Database Records
    const enrollment = await createEnrollment({
      email,
      firstName,
      lastName,
      phone,
      relationship,
      studentIds,
      stripeCustomerId: customer.id,
    })

    // 4. Create SetupIntent
    try {
      const setupIntent = await createSetupIntent(customer.id, {
        payorId: enrollment.payor.id,
        totalAmount: total.toString(),
        studentIds: enrollment.students.map((s) => s.id).join(','),
      })

      // 5. Return success response
      const response: EnrollmentResponse = {
        clientSecret: setupIntent.client_secret!,
        customerId: customer.id,
        setupIntent,
        enrollment: {
          payorId: enrollment.payor.id,
          studentIds: enrollment.students.map((s) => s.id),
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        console.error('❌ SetupIntent creation failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          type:
            error instanceof Stripe.errors.StripeError ? error.type : 'Unknown',
          code:
            error instanceof Stripe.errors.StripeError ? error.code : 'Unknown',
          customerId: customer.id,
          payorId: enrollment.payor.id,
          studentIds: enrollment.students.map((s) => s.id),
        })

        // Cleanup created records
        await cleanupEnrollmentRecords(enrollment.payor.id)

        throw Errors.setupIntent()
      }
      throw error
    }
  } catch (error) {
    return handleError(error)
  }
}
