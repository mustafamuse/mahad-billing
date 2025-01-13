// StripePaymentForm.jsx
'use client'

import { useEffect, useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StripePaymentFormProps {
  clientSecret: string
  className?: string
}

export function StripePaymentForm({
  clientSecret,
  className,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!stripe || !clientSecret) {
      return
    }

    const setupBankAccount = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const { error } = await stripe.collectBankAccountForSetup({
          clientSecret,
          params: {
            payment_method_type: 'us_bank_account',
            payment_method_data: {
              billing_details: {
                email: 'jenny.rosen@example.com',
              },
            },
          },
        })

        if (error) {
          throw error
        }

        // Redirect to verify page with setupIntent ID
        const setupIntentId = clientSecret.split('_secret_')[0]
        window.location.href = `/enrollment/verify?setup_intent=${setupIntentId}`
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to set up bank account')
      } finally {
        setIsLoading(false)
      }
    }

    setupBankAccount()
  }, [stripe, clientSecret])

  return (
    <div className={cn('space-y-4', className)}>
      {errorMessage && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <Button disabled className="w-full" variant="outline">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up your bank account...
          </>
        ) : (
          'Bank account setup complete'
        )}
      </Button>
    </div>
  )
}
