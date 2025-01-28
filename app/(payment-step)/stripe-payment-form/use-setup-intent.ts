import { useState } from 'react'

import type { PaymentMethod, SetupIntent } from '@stripe/stripe-js'

import { getSetupIntent } from '@/lib/actions/get-setup-intent'

import { FormStatus } from './types'

interface UseSetupIntentProps {
  onComplete: (setupIntentId: string) => Promise<void>
}

interface BankDetails {
  bankName?: string
  last4?: string
  routingNumber?: string
  accountType?: string
}

export function useSetupIntent({ onComplete }: UseSetupIntentProps) {
  const [status, setStatus] = useState<FormStatus>('initial')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)

  /**
   * Fetches an expanded SetupIntent using a server action
   * @param setupIntentId - ID of the SetupIntent
   */
  const fetchExpandedSetupIntent = async (
    setupIntentId: string
  ): Promise<SetupIntent> => {
    return getSetupIntent(setupIntentId)
  }

  /**
   * Handles various statuses of the SetupIntent during the setup process
   */
  const handleSetupIntentStatus = async (
    setupIntentStatus: string,
    setupIntentId: string,
    setupIntent?: SetupIntent
  ) => {
    console.log('Setup Intent Status:', setupIntentStatus)
    console.log('Setup Intent:', setupIntent)

    setStatus(setupIntentStatus as FormStatus)

    try {
      // Always fetch the expanded version since we know client-side setupIntent won't have expanded payment_method
      const fullSetupIntent = await fetchExpandedSetupIntent(setupIntentId)

      // Handle different statuses
      switch (setupIntentStatus) {
        case 'requires_payment_method':
          setErrorMessage('Please try setting up your bank account again.')
          break
        case 'requires_confirmation':
          if (
            fullSetupIntent?.payment_method &&
            typeof fullSetupIntent.payment_method !== 'string'
          ) {
            const paymentMethod =
              fullSetupIntent.payment_method as PaymentMethod
            console.log('Payment Method:', paymentMethod)

            if (paymentMethod.us_bank_account) {
              console.log(
                'Bank Account Details:',
                paymentMethod.us_bank_account
              )
              setBankDetails({
                bankName: paymentMethod.us_bank_account.bank_name || undefined,
                last4: paymentMethod.us_bank_account.last4 || undefined,
                routingNumber:
                  paymentMethod.us_bank_account.routing_number || undefined,
                accountType:
                  paymentMethod.us_bank_account.account_type || undefined,
              })
            } else {
              console.log('No us_bank_account found in payment method')
            }
          } else {
            console.log('No payment_method found in SetupIntent')
          }
          setProgress(60)
          break
        case 'requires_action':
          setProgress(75)
          break
        case 'processing':
          setProgress(90)
          break
        case 'succeeded':
          setProgress(100)
          await onComplete(setupIntentId)
          break
        case 'canceled':
          setErrorMessage('The bank account setup was canceled.')
          setProgress(0)
          break
        default:
          setErrorMessage('An unexpected error occurred. Please try again.')
          setProgress(0)
          break
      }
    } catch (error) {
      console.error('Error in handleSetupIntentStatus:', error)
      setErrorMessage(
        'Failed to retrieve setup intent details. Please try again.'
      )
    }
  }

  return {
    status,
    isLoading,
    errorMessage,
    progress,
    bankDetails,
    handleSetupIntentStatus,
    setIsLoading,
    setErrorMessage,
    setProgress,
    setBankDetails,
  }
}
