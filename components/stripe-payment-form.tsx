'use client'

import { useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

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
  const [status, setStatus] = useState<FormStatus>('initial')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

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
      setStatus('succeeded')
      toast.success('Enrollment completed successfully! 🎉')

      // Wait for animation
      await new Promise((resolve) => setTimeout(resolve, 1000))
      window.location.href = '/enrollment/success'
    } catch (err: any) {
      console.error('Error completing enrollment:', err)
      setErrorMessage(err.message || 'An error occurred')
      setProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusMessage = () => {
    const baseCardClass = cn(
      'rounded-lg md:rounded-xl',
      'p-3 md:p-4 lg:p-5',
      'border-2'
    )

    const baseBannerClass = cn(
      'space-y-1 md:space-y-2',
      'text-xs md:text-sm lg:text-base'
    )

    const baseIconClass = cn(
      'flex-shrink-0',
      'h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6'
    )

    const baseListClass = cn(
      'space-y-1 md:space-y-1.5 lg:space-y-2',
      'ml-3 md:ml-4 lg:ml-5 mt-2',
      'text-xs md:text-sm lg:text-base'
    )

    switch (status) {
      case 'processing':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 md:space-y-4 lg:space-y-5"
          >
            {/* Status Banner */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(baseCardClass, 'border-primary/50 bg-primary/10')}
            >
              <div className="flex items-start space-x-3">
                <Loader2
                  className={cn(
                    baseIconClass,
                    'mt-0.5 flex-shrink-0 animate-spin text-primary'
                  )}
                />
                <div className={baseBannerClass}>
                  <h3 className="font-semibold text-primary">
                    Processing Your Setup
                  </h3>
                  <p className="text-muted-foreground">
                    Your bank account setup is complete! We're finalizing your
                    enrollment.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Detailed Explanation */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={baseCardClass}
            >
              <h4 className="font-medium">Why this might have happened:</h4>
              <ul className={baseListClass}>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.3 }}
                >
                  The account details were entered incorrectly
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.4 }}
                >
                  The bank account is not eligible for ACH payments
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.5 }}
                >
                  The bank rejected the verification attempt
                </motion.li>
              </ul>
            </motion.div>

            {/* Action Guidance */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className={baseCardClass}
            >
              <p className="font-medium text-primary">What to do next:</p>
              <p className="mt-1 text-muted-foreground">
                Click the button below to try again with your bank account
                details. Make sure to double-check all information.
              </p>
            </motion.div>
          </motion.div>
        )
      case 'requires_action':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 md:space-y-4 lg:space-y-5"
          >
            {/* Error Banner */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                baseCardClass,
                'border-destructive/50 bg-destructive/10'
              )}
            >
              <div className="flex items-start space-x-3">
                <XCircle
                  className={cn(
                    baseIconClass,
                    'mt-0.5 flex-shrink-0 text-destructive'
                  )}
                />
                <div className={baseBannerClass}>
                  <h3 className="font-semibold text-destructive">
                    Bank Verification Failed
                  </h3>
                  <p className="text-muted-foreground">
                    We encountered an issue while verifying your bank account
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Detailed Explanation */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={baseCardClass}
            >
              <h4 className="font-medium">Why this might have happened:</h4>
              <ul className={baseListClass}>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.3 }}
                >
                  The account details were entered incorrectly
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.4 }}
                >
                  The bank account is not eligible for ACH payments
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.5 }}
                >
                  The bank rejected the verification attempt
                </motion.li>
              </ul>
            </motion.div>

            {/* Action Guidance */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className={baseCardClass}
            >
              <p className="font-medium text-primary">What to do next:</p>
              <p className="mt-1 text-muted-foreground">
                Click the button below to try again with your bank account
                details. Make sure to double-check all information.
              </p>
            </motion.div>
          </motion.div>
        )
      case 'requires_confirmation':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 md:space-y-4 lg:space-y-5"
          >
            {/* Status Banner */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(baseCardClass, 'border-primary/50 bg-primary/10')}
            >
              <div className="flex items-start space-x-3">
                <Loader2
                  className={cn(
                    baseIconClass,
                    'mt-0.5 flex-shrink-0 animate-spin text-primary'
                  )}
                />
                <div className={baseBannerClass}>
                  <h3 className="font-semibold text-primary">
                    Confirming Bank Account Setup
                  </h3>
                  <p className="text-muted-foreground">
                    Please review your bank account details below to ensure
                    they're correct.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Detailed Explanation */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={baseCardClass}
            >
              <h4 className="font-medium">After confirmation:</h4>
              <p className="mt-2 text-muted-foreground">
                Your first payment will be processed in 5-7 business days.
              </p>
            </motion.div>
          </motion.div>
        )
      case 'requires_payment_method':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Error Banner */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4"
            >
              <div className="flex items-start space-x-3">
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                <div>
                  <h3 className="font-semibold text-destructive">
                    Bank Account Verification Failed
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We encountered an issue while verifying your bank account
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Detailed Explanation */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="rounded-lg border bg-muted/50 p-4"
            >
              <h4 className="font-medium">Why this might have happened:</h4>
              <ul className="ml-4 mt-2 list-disc space-y-1.5 text-sm text-muted-foreground">
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.3 }}
                >
                  The account details were entered incorrectly
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.4 }}
                >
                  The bank account is not eligible for ACH payments
                </motion.li>
                <motion.li
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.5 }}
                >
                  The bank rejected the verification attempt
                </motion.li>
              </ul>
            </motion.div>

            {/* Action Guidance */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="rounded-lg bg-primary/5 p-4 text-sm"
            >
              <p className="font-medium text-primary">What to do next:</p>
              <p className="mt-1 text-muted-foreground">
                Click the button below to try again with your bank account
                details. Make sure to double-check all information.
              </p>
            </motion.div>
          </motion.div>
        )
      default:
        return null
    }
  }

  const setupBankAccount = async () => {
    if (!stripe) return

    // Optimistic UI updates
    setErrorMessage(null)
    if (status === 'requires_payment_method') {
      setStatus('initial')
    }
    setProgress(0) // Start progress at 0
    setIsLoading(true)

    try {
      // Initial Progress: Start setup
      setProgress(10)

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

      // Update progress for status processing
      setProgress(30)

      if (error) {
        setErrorMessage(error.message ?? 'Failed to setup bank account')
        setStatus('requires_payment_method')
        setProgress(0) // Reset progress on error
        return
      }

      if (!setupIntent) {
        setErrorMessage('Failed to setup bank account')
        setStatus('requires_payment_method')
        setProgress(0) // Reset progress on error
        return
      }

      // Handle known statuses and update progress
      switch (setupIntent.status) {
        case 'requires_payment_method':
          setProgress(0) // Reset on failure
          setStatus('requires_payment_method')
          toast.error('Bank account verification failed', {
            description: 'Please try again with valid bank details.',
          })
          return

        case 'requires_confirmation':
          setProgress(60) // Intermediate progress for confirmation
          setStatus('requires_confirmation')
          return

        case 'requires_action':
          setProgress(75) // Micro-deposit initiated
          setStatus('requires_action')
          toast.info('Micro-deposits initiated', {
            description:
              'Two small deposits will be sent to your bank account.',
          })
          return

        case 'succeeded':
          setProgress(100) // Completion
          setStatus('processing')
          toast.success(
            'Bank account setup complete! Your subscription is being processed.'
          )
          await completeEnrollment(setupIntent.id)
          return

        default:
          // Fallback for unexpected status
          console.error('Unexpected setup intent status:', setupIntent.status)
          setErrorMessage(
            `Unexpected status: ${setupIntent.status}. Please try again or contact support.`
          )
          setStatus('requires_payment_method')
          setProgress(0) // Reset on unexpected status
          return
      }
    } catch (err) {
      console.error('Bank account setup error:', err)
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
      setProgress(0) // Reset progress on error
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
    <div
      className={cn(
        'w-full',
        'px-4 md:px-6 lg:px-8',
        'md:max-w-none',
        'max-w-[500px] md:max-w-none',
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          {/* Error Alert */}
          {errorMessage && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription className="text-sm md:text-base">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2 md:space-y-3"
            >
              <Progress value={progress} className="h-1.5 md:h-2 lg:h-2.5" />
              <p className="text-center text-xs text-muted-foreground md:text-sm lg:text-base">
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
              className="w-full"
            >
              {getStatusMessage()}
            </motion.div>
          </AnimatePresence>

          {/* Button Container */}
          <div
            className={cn('relative w-full', 'bg-transparent', 'mt-4 md:mt-6')}
          >
            <div className="mx-auto max-w-[500px] md:max-w-none">
              <Button
                onClick={
                  status === 'requires_confirmation'
                    ? confirmSetup
                    : setupBankAccount
                }
                disabled={isLoading || !stripe}
                className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {status === 'requires_confirmation'
                      ? 'Confirming...'
                      : 'Setting up...'}
                  </>
                ) : status === 'requires_confirmation' ? (
                  'Confirm Bank Account Setup'
                ) : status === 'requires_payment_method' ? (
                  'Retry Setup'
                ) : status === 'requires_action' ? (
                  'Try Again'
                ) : status === 'processing' ? (
                  'Processing...'
                ) : (
                  'Set up bank account'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
