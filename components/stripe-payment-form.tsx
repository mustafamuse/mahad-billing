// StripePaymentForm.jsx
'use client'

import { useEffect, useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'

interface StripePaymentFormProps {
  onSuccess: () => void
  onError: (error: Error) => void
  clientSecret: string
  customerName: string
  customerEmail: string
}

export function StripePaymentForm({
  onSuccess,
  onError,
  clientSecret,
  customerName,
  customerEmail,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!stripe || !clientSecret) return

    const collectBankAccount = async () => {
      setIsProcessing(true)

      try {
        const { error: collectError } = await stripe.collectBankAccountForSetup(
          {
            clientSecret,
            params: {
              payment_method_type: 'us_bank_account',
              payment_method_data: {
                billing_details: {
                  name: customerName,
                  email: customerEmail,
                },
              },
            },
          }
        )

        if (collectError) {
          console.error('Error during bank account collection:', collectError)
          throw collectError
        }

        // Confirm the SetupIntent
        const { setupIntent, error: confirmError } =
          await stripe.confirmUsBankAccountSetup(clientSecret)

        if (confirmError) {
          console.error(
            'Error during bank account setup confirmation:',
            confirmError
          )
          throw confirmError
        }

        // Check the SetupIntent status
        if (setupIntent?.status === 'succeeded') {
          onSuccess()
        } else if (setupIntent?.status === 'requires_action') {
          if (setupIntent.next_action?.type === 'verify_with_microdeposits') {
            throw new Error('Setup failed. Please try again.')
          } else {
            console.error(
              `Unexpected next_action type: ${setupIntent.next_action?.type}`
            )
            throw new Error('Unexpected verification step required.')
          }
        } else {
          console.error(`Unexpected SetupIntent status: ${setupIntent?.status}`)
          throw new Error('Setup failed. Please try again.')
        }
      } catch (error) {
        console.error(
          'Error during bank account collection and confirmation:',
          error
        )
        onError(error as Error)
      } finally {
        setIsProcessing(false)
      }
    }

    // Automatically start the bank account collection process
    collectBankAccount()
  }, [stripe, clientSecret, customerName, customerEmail, onSuccess, onError])

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-card p-6 text-center shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          Connecting Your Bank Account
        </h2>
        {isProcessing && (
          <p className="text-muted-foreground">
            Please follow the prompts to connect your bank account...
          </p>
        )}
      </div>
    </div>
  )
}
