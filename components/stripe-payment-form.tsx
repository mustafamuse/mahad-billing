// StripePaymentForm.jsx
'use client'

import { useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface StripePaymentFormProps {
  clientSecret: string
  payorDetails: {
    email: string
    name: string
    phone: string
  }
  className?: string
}

export function StripePaymentForm({
  clientSecret,
  payorDetails,
  className,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)

  const setupBankAccount = async () => {
    if (!stripe) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      console.log('Starting bank account setup with details:', { payorDetails })

      const { setupIntent, error } = await stripe.collectBankAccountForSetup({
        clientSecret,
        params: {
          payment_method_type: 'us_bank_account',
          payment_method_data: {
            billing_details: {
              email: payorDetails.email,
              name: payorDetails.name,
              phone: payorDetails.phone,
            },
          },
        },
      })

      if (error) {
        console.error('Bank account setup error:', error)
        setErrorMessage(error.message ?? 'Failed to setup bank account')
        return
      }

      if (!setupIntent) {
        setErrorMessage('Failed to setup bank account')
        return
      }

      console.log('SetupIntent status:', setupIntent.status)

      if (setupIntent.status === 'requires_confirmation') {
        console.log(
          '🔄 Mandate acceptance required - showing confirmation UI',
          {
            setupIntentId: setupIntent.id,
            paymentMethod: setupIntent.payment_method,
            timestamp: new Date().toISOString(),
          }
        )
        setRequiresConfirmation(true)
        return
      }

      if (setupIntent.status === 'requires_action') {
        console.log('⚠️ Bank verification required - waiting for user action', {
          setupIntentId: setupIntent.id,
          timestamp: new Date().toISOString(),
        })
        return
      }

      if (setupIntent.status === 'succeeded') {
        console.log('✅ Bank account setup succeeded - redirecting to verify', {
          setupIntentId: setupIntent.id,
          timestamp: new Date().toISOString(),
        })
        window.location.href = `/enrollment/verify?setup_intent=${setupIntent.id}`
      }
    } catch (err) {
      console.error('Error in bank account setup:', err)
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmSetup = async () => {
    if (!stripe) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      console.log('🔄 Starting mandate confirmation process')
      const { setupIntent, error } =
        await stripe.confirmUsBankAccountSetup(clientSecret)

      if (error) {
        console.error('❌ Setup confirmation error:', error)
        setErrorMessage(error.message ?? 'Failed to confirm bank account')
        return
      }

      if (setupIntent?.status === 'succeeded') {
        console.log(
          '✅ Mandate confirmed successfully - redirecting to verify',
          {
            setupIntentId: setupIntent.id,
            timestamp: new Date().toISOString(),
          }
        )
        window.location.href = `/enrollment/verify?setup_intent=${setupIntent.id}`
      } else {
        console.log('⚠️ Unexpected setup status after confirmation:', {
          status: setupIntent?.status,
          setupIntentId: setupIntent?.id,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error('Error in setup confirmation:', err)
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (requiresConfirmation) {
    return (
      <div className={className}>
        <Alert className="mb-4">
          <AlertDescription>
            By clicking confirm, you authorize Stripe to debit your account for
            future payments in accordance with our terms.
          </AlertDescription>
        </Alert>
        <Button onClick={confirmSetup} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            'Confirm Bank Account Setup'
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={setupBankAccount}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up...
          </>
        ) : (
          'Set up bank account'
        )}
      </Button>
    </div>
  )
}
