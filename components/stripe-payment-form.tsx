// StripePaymentForm.jsx
'use client'

import { useEffect, useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'

interface StripePaymentFormProps {
  onSuccess: (data: { setupIntentId: string }) => void
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
        // Step 1: Collect bank account
        console.log('🏦 Starting bank account collection...')
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
          console.error('❌ Bank collection error:', collectError)
          throw new Error(
            collectError.message || 'Failed to collect bank account'
          )
        }

        console.log('✅ Bank account collected successfully')

        // Step 2: Confirm setup
        console.log('🔄 Confirming bank account setup...')
        const { setupIntent, error: confirmError } =
          await stripe.confirmUsBankAccountSetup(clientSecret)

        if (confirmError) {
          console.error('❌ Setup confirmation error:', confirmError)
          throw new Error(
            confirmError.message || 'Failed to confirm bank account'
          )
        }

        console.log('🎯 Setup confirmation response:', setupIntent)

        // Step 3: Verify success
        if (setupIntent?.status === 'succeeded') {
          console.log('🎉 Setup completed successfully:', {
            setupIntentId: setupIntent.id,
            status: setupIntent.status,
          })

          onSuccess({ setupIntentId: setupIntent.id })
        } else {
          throw new Error(`Setup failed with status: ${setupIntent?.status}`)
        }
      } catch (error) {
        console.error('❌ Payment setup failed:', error)
        onError(
          error instanceof Error ? error : new Error('Unknown error occurred')
        )
      } finally {
        setIsProcessing(false)
      }
    }

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
