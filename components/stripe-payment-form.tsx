// StripePaymentForm.jsx
'use client'

import { useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

type FormStatus =
  | 'initial'
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'canceled'

export function StripePaymentForm({
  clientSecret,
  payorDetails,
  className,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<FormStatus>('initial')

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              We're processing your bank account setup. This should only take a
              moment.
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              Please don't close this window while we complete the setup.
            </p>
          </div>
        )
      case 'requires_action':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              We've initiated two small deposits to verify your bank account.
              Please note:
            </p>
            <ul className="ml-4 list-disc text-sm text-muted-foreground">
              <li>
                Look for deposits labeled "STRIPE VERIFICATION" or
                "VERIFICATION"
              </li>
              <li>Each deposit will be less than $1.00</li>
              <li>They'll appear in 1-2 business days</li>
              <li>
                Once you see them, return to the main page and click "Complete
                Bank Verification"
              </li>
            </ul>
          </div>
        )
      case 'requires_confirmation':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Please review your bank account details below to ensure they're
              correct.
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              After confirmation, your first payment will be processed in 5-7
              business days.
            </p>
          </div>
        )
      default:
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Connect your bank account for automatic monthly payments.
            </p>
            <ul className="ml-4 list-disc text-sm text-muted-foreground">
              <li>Secure bank-to-bank transfer (ACH)</li>
              <li>No processing fees</li>
              <li>Cancel anytime with no penalties</li>
            </ul>
          </div>
        )
    }
  }

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
        setStatus('requires_confirmation')
        return
      }

      if (setupIntent.status === 'requires_action') {
        console.log(
          '⚠️ Bank verification required - initiating micro-deposits',
          {
            setupIntentId: setupIntent.id,
            timestamp: new Date().toISOString(),
          }
        )
        setStatus('requires_action')
        toast.info('Micro-deposits initiated', {
          description: 'Two small deposits will be sent to your bank account.',
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

      if (setupIntent?.status === 'requires_action') {
        console.log('⚠️ Micro-deposits required after confirmation', {
          setupIntentId: setupIntent.id,
          timestamp: new Date().toISOString(),
        })
        setStatus('requires_action')
        toast.info('Micro-deposits initiated', {
          description: 'Two small deposits will be sent to your bank account.',
        })
        return
      }

      if (setupIntent?.status === 'succeeded') {
        console.log('✅ Setup completed successfully - redirecting to verify', {
          setupIntentId: setupIntent.id,
          timestamp: new Date().toISOString(),
        })
        window.location.href = `/enrollment/verify?setup_intent=${setupIntent.id}`
      }
    } catch (err) {
      console.error('Error in setup confirmation:', err)
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {getStatusMessage()}

      {status === 'requires_action' && (
        <div className="mt-4 rounded-lg border bg-muted/50 p-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium">What are micro-deposits?</p>
              <p className="mt-1">
                Micro-deposits are a secure way to verify your bank account
                ownership. We'll send two small test deposits that you'll need
                to confirm. These deposits will be automatically refunded.
              </p>
            </div>
            <div>
              <p className="font-medium">What happens next?</p>
              <ol className="ml-4 mt-1 list-decimal space-y-1">
                <li>
                  Watch for two deposits labeled "STRIPE VERIFICATION" or
                  "VERIFICATION"
                </li>
                <li>
                  Once you see them, go to the main page and click "Complete
                  Bank Verification"
                </li>
                <li>Enter the deposit amounts to verify your account</li>
                <li>
                  Once verified, your account will be ready for monthly payments
                </li>
              </ol>
            </div>
            <div>
              <p className="font-medium">Need help?</p>
              <p className="mt-1">
                If you don't see the deposits after 2-3 business days, please
                reach out!
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'requires_confirmation' ? (
        <Button
          onClick={confirmSetup}
          disabled={isLoading || !stripe}
          className="mt-4 w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            'Confirm Bank Account Setup'
          )}
        </Button>
      ) : (
        <Button
          onClick={setupBankAccount}
          disabled={isLoading || !stripe}
          className="mt-4 w-full"
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
      )}
    </div>
  )
}
