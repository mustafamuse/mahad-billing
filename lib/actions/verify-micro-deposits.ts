'use server'

import { bankMicroDepositSchema } from '../schemas/bank-verification'
import { stripeServerClient } from '../stripe'

export async function verifyMicroDeposits(formData: {
  setupId: string
  amount1: string
  amount2: string
}) {
  try {
    // Validate user input
    const validatedData = bankMicroDepositSchema.parse(formData)

    // Convert amounts to cents
    const amounts = [
      Math.round(Number(validatedData.amount1) * 100),
      Math.round(Number(validatedData.amount2) * 100),
    ]

    // Submit verification request to Stripe
    const setupIntent =
      await stripeServerClient.setupIntents.verifyMicrodeposits(
        validatedData.setupId,
        { amounts }
      )

    // Success: return verification result
    if (setupIntent.status === 'succeeded') {
      return { success: true, verification: setupIntent }
    }

    // Handle different failure cases
    let errorMessage =
      'Verification failed. Please check your deposit amounts and try again.'

    if (setupIntent.last_setup_error?.message) {
      errorMessage = setupIntent.last_setup_error.message
    }

    throw new Error(errorMessage)
  } catch (error) {
    console.error('Micro-deposit verification failed:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Verification failed'
    )
  }
}
