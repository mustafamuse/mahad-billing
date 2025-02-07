'use server'

import { stripeServerClient } from '@/lib/stripe'

interface SerializableSetupIntent {
  id: string
  status: string
  clientSecret: string | null
  paymentMethod: {
    id: string
    type: string
    bankName?: string
    last4?: string
    routingNumber?: string
    accountType?: string
  } | null
}

/**
 * Fetches a SetupIntent with expanded payment method details and returns only serializable data
 */
export async function getSetupIntent(
  id: string
): Promise<SerializableSetupIntent> {
  if (!id) {
    throw new Error('Invalid SetupIntent ID')
  }

  try {
    // Fetch the SetupIntent from Stripe
    const setupIntent = await stripeServerClient.setupIntents.retrieve(id, {
      expand: ['payment_method'],
    })

    // Extract only the serializable data we need
    const serializableSetupIntent: SerializableSetupIntent = {
      id: setupIntent.id,
      status: setupIntent.status,
      clientSecret: setupIntent.client_secret,
      paymentMethod:
        setupIntent.payment_method &&
        typeof setupIntent.payment_method !== 'string'
          ? {
              id: setupIntent.payment_method.id,
              type: setupIntent.payment_method.type,
              bankName:
                setupIntent.payment_method.us_bank_account?.bank_name ||
                undefined,
              last4:
                setupIntent.payment_method.us_bank_account?.last4 || undefined,
              routingNumber:
                setupIntent.payment_method.us_bank_account?.routing_number ||
                undefined,
              accountType:
                setupIntent.payment_method.us_bank_account?.account_type ||
                undefined,
            }
          : null,
    }

    return serializableSetupIntent
  } catch (error) {
    console.error('Error fetching SetupIntent:', error)
    throw new Error('Failed to fetch SetupIntent')
  }
}
