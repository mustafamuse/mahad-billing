import { NextRequest, NextResponse } from 'next/server'

import Stripe from 'stripe'

import { bankMicroDepositApiSchema } from '@/lib/schemas/bank-verification'
import { stripeServerClient } from '@/lib/stripe'
import { handleError } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { setupId, amounts } = bankMicroDepositApiSchema.parse(body)

    // Convert amounts to cents as required by Stripe
    const amountsInCents = amounts.map((amount) =>
      Math.round(Number(amount) * 100)
    )
    console.log('Verifying Micro-deposits', {
      setupId,
      amounts: amountsInCents,
    })
    // Verify the amounts with Stripe
    const setupIntent =
      await stripeServerClient.setupIntents.verifyMicrodeposits(setupId, {
        amounts: amountsInCents,
      })

    // Check if verification was successful
    if (setupIntent.status === 'succeeded') {
      console.log('Micro-deposits Verified', {
        setupId,
        status: setupIntent.status,
      })
      return NextResponse.json({ success: true })
    }

    // If not successful, return the error
    return NextResponse.json(
      {
        success: false,
        error: setupIntent.last_setup_error?.message || 'Verification failed',
        code: setupIntent.last_setup_error?.code,
        type: 'StripeInvalidRequestError',
      },
      { status: 400 }
    )
  } catch (error) {
    // Handle Stripe errors specifically
    if (error instanceof Stripe.errors.StripeError) {
      handleError('Micro-deposit Verification', 'stripe_error', error)

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          type: error.type,
        },
        { status: getStatusCodeForStripeError(error) }
      )
    }

    // Handle validation errors
    if (error instanceof Error) {
      handleError('Micro-deposit Verification', 'validation_error', error)
      return NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Handle unknown errors
    handleError('Micro-deposit Verification', 'unknown_error', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

function getStatusCodeForStripeError(error: Stripe.errors.StripeError): number {
  switch (error.type) {
    case 'StripeInvalidRequestError':
      return 400 // Bad request
    case 'StripeAuthenticationError':
      return 401 // Unauthorized
    case 'StripeRateLimitError':
      return 429 // Too many requests
    case 'StripeAPIError':
      return 503 // Service unavailable
    default:
      return 400
  }
}
