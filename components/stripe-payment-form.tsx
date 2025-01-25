'use client'

import { useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface StripePaymentFormProps {
  clientSecret: string
  payorDetails: {
    email: string
    name: string
    phone: string
  }
  className?: string
  studentIds: string[]
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
  studentIds,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<FormStatus>('initial')
  const [progress, setProgress] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  const completeEnrollment = async (setupIntentId: string) => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      setProgress(30)

      const response = await fetch('/api/enrollment/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ setupIntentId, studentIds }),
      })

      setProgress(60)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to complete enrollment')
      }

      setProgress(100)
      setShowSuccess(true)
      setStatus('succeeded')
      toast.success('Enrollment completed successfully! 🎉')

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 1000))
      window.location.href = '/enrollment/success'
    } catch (err: any) {
      console.error('Error completing enrollment:', err)
      setErrorMessage(err.message || 'An error occurred')
      setProgress(0)
      setShowSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your bank account setup is complete! We're now:
            </p>
            <ul className="ml-4 list-disc text-sm text-muted-foreground">
              <li>Processing your subscription setup</li>
              <li>Setting up automatic payments</li>
              <li>Preparing your account</li>
            </ul>
            <p className="text-sm font-medium text-muted-foreground">
              This usually takes less than a minute. Please wait...
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
        return null
    }
  }

  const setupBankAccount = async () => {
    if (!stripe) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
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
        setErrorMessage(error.message ?? 'Failed to setup bank account')
        return
      }

      if (!setupIntent) {
        setErrorMessage('Failed to setup bank account')
        return
      }

      if (setupIntent.status === 'requires_confirmation') {
        setStatus('requires_confirmation')
        return
      }

      if (setupIntent.status === 'requires_action') {
        setStatus('requires_action')
        toast.info('Micro-deposits initiated', {
          description: 'Two small deposits will be sent to your bank account.',
        })
        return
      }

      if (setupIntent.status === 'succeeded') {
        setStatus('processing')
        toast.success(
          'Bank account setup complete! Your subscription is being processed.'
        )
        await completeEnrollment(setupIntent.id)
      }
    } catch (err) {
      console.error('Bank account setup error:', err)
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
        await completeEnrollment(setupIntent.id)
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
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Status Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex justify-center"
          >
            {isLoading ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : showSuccess ? (
              <CheckCircle2 className="h-12 w-12 text-primary" />
            ) : errorMessage ? (
              <XCircle className="h-12 w-12 text-destructive" />
            ) : null}
          </motion.div>

          {/* Progress Bar */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {progress === 100
                  ? 'Complete!'
                  : 'Processing your enrollment...'}
              </p>
            </motion.div>
          )}

          {/* Status Messages */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {getStatusMessage()}
            </motion.div>
          </AnimatePresence>

          {/* Micro-deposit Info Card */}
          {status === 'requires_action' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border bg-muted/50 p-4"
            >
              <div className="space-y-4 text-sm text-muted-foreground">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="font-medium">What are micro-deposits?</p>
                  <p className="mt-1">
                    Micro-deposits are a secure way to verify your bank account
                    ownership. We'll send two small test deposits that you'll
                    need to confirm.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="font-medium">What happens next?</p>
                  <ol className="ml-4 mt-1 list-decimal space-y-1">
                    <li>
                      Watch for two deposits labeled "STRIPE VERIFICATION"
                    </li>
                    <li>
                      Once you see them, return here to complete verification
                    </li>
                    <li>Enter the deposit amounts to verify your account</li>
                    <li>
                      Your account will then be ready for monthly payments
                    </li>
                  </ol>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="font-medium">Need help?</p>
                  <p className="mt-1">
                    If you don't see the deposits after 2-3 business days,
                    please reach out!
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Buttons */}
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
          ) : status === 'canceled' ? (
            <Button
              onClick={setupBankAccount}
              disabled={isLoading || !stripe}
              className="mt-4 w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry Setup'
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
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
