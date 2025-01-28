'use server'

import { stripeServerClient } from '../stripe'

export async function getPendingVerifications() {
  try {
    console.log('Fetching setup intents...')
    const setupIntents = await stripeServerClient.setupIntents.list({
      limit: 100,
      expand: ['data.customer'],
    })

    console.log('Total setup intents:', setupIntents.data.length)

    // Filter only bank accounts with micro-deposit verification required
    const pendingVerifications = setupIntents.data.filter((intent) => {
      const isValidStatus = intent.status === 'requires_payment_method'
      const isUsBankAccount =
        intent.payment_method_types.includes('us_bank_account')
      const hasMicroDeposits =
        intent.payment_method_options?.us_bank_account?.verification_method ===
        'microdeposits'
      const isTest = intent.metadata?.is_test === 'true'

      console.log('Setup Intent:', {
        id: intent.id,
        status: intent.status,
        paymentTypes: intent.payment_method_types,
        nextAction: intent.next_action?.type,
        microDeposits:
          intent.payment_method_options?.us_bank_account?.verification_method,
        isTest,
        isMatch: isValidStatus && isUsBankAccount && hasMicroDeposits && isTest,
      })

      return isValidStatus && isUsBankAccount && hasMicroDeposits && isTest
    })

    console.log('Pending verifications:', pendingVerifications.length)

    // Format the response
    const formattedVerifications = pendingVerifications.map((intent) => {
      const customer = intent.customer as any
      return {
        id: intent.id,
        email: customer?.email ?? 'Unknown',
        name: customer?.name ?? 'Unknown',
        created: new Date(intent.created * 1000).toISOString(),
        last_setup_error: intent.last_setup_error?.message ?? null,
      }
    })

    return {
      success: true,
      verifications: formattedVerifications,
    }
  } catch (error) {
    console.error('Failed to fetch pending verifications:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch verifications'
    )
  }
}
