// StripePaymentForm.jsx
'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { useStripe } from '@stripe/react-stripe-js'

interface StripePaymentFormProps {
  onSuccess: (data: { setupIntentId: string }) => void
  onError: (error: Error) => void
  clientSecret: string
  customerName: string
  customerEmail: string
}

export function StripePaymentForm({
  clientSecret,
  customerName,
  customerEmail,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!stripe || !clientSecret) return

    const collectBankAccount = async () => {
      setIsProcessing(true)
      try {
        const { setupIntent, error } = await stripe.collectBankAccountForSetup({
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
        })

        if (error) {
          throw error
        }

        if (setupIntent?.status === 'succeeded') {
          console.log('🎉 Setup completed successfully:', {
            setupIntentId: setupIntent.id,
            status: setupIntent.status,
          })
          router.push(`/payment-success?setupIntentId=${setupIntent.id}`)
        } else {
          throw new Error(`Setup failed with status: ${setupIntent?.status}`)
        }
      } catch (error) {
        console.error('❌ Setup failed:', error)
        onError(error as Error)
      } finally {
        setIsProcessing(false)
      }
    }

    collectBankAccount()
  }, [stripe, clientSecret, customerName, customerEmail, onError, router])

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
