'use server'

import type { SetupIntent } from '@stripe/stripe-js'

import { stripeServerClient } from '@/lib/stripe'

/**
 * Fetches a SetupIntent with expanded payment method details
 */
export async function getSetupIntent(id: string): Promise<SetupIntent> {
  if (!id) {
    throw new Error('Invalid SetupIntent ID')
  }

  try {
    // Fetch the SetupIntent from Stripe
    const setupIntent = await stripeServerClient.setupIntents.retrieve(id, {
      expand: ['payment_method'],
    })

    // Convert to client-side type
    return setupIntent as unknown as SetupIntent
  } catch (error) {
    console.error('Error fetching SetupIntent:', error)
    throw new Error('Failed to fetch SetupIntent')
  }
}
