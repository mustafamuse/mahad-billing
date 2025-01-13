'use client'

import { useEffect, useState, useRef } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { verifySetup } from '@/app/actions/verify-setup'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useEnrollment } from '@/contexts/enrollment-context'
import { cn } from '@/lib/utils'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const { state, actions } = useEnrollment()
  const verificationStarted = useRef(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )
  const [error, setError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(false)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const setupIntent = searchParams.get('setup_intent')
    if (!setupIntent) {
      console.error('❌ Missing setupIntent in URL parameters')
      setError('Invalid setupIntent. Please try again.')
      setStatus('error')
      return
    }

    // Prevent duplicate verification attempts
    if (verificationStarted.current) {
      console.log('🛑 Verification already started, skipping duplicate attempt')
      return
    }
    verificationStarted.current = true

    const handleVerification = async () => {
      console.log('🔄 Starting verification process:', {
        setupIntent,
        timestamp: new Date().toISOString(),
      })

      try {
        // Start progress animation
        setProgress(30)
        console.log('⏳ Progress: 30% - Initiating verification')

        // Call server action to verify setup
        console.log('📡 Calling verifySetup server action')
        const result = await verifySetup(setupIntent)
        console.log('✅ Verification result:', result)

        // Update progress
        setProgress(60)
        console.log('⏳ Progress: 60% - Processing verification result')

        if (!result.success) {
          console.warn('⚠️ Verification failed:', {
            error: result.error,
            canRetry: result.canRetry,
            attemptsLeft: result.attemptsLeft,
          })
          setCanRetry(!!result.canRetry)
          if (result.attemptsLeft) {
            setAttemptsLeft(result.attemptsLeft)
          }
          throw new Error(result.error || 'Verification failed')
        }

        // Complete progress
        setProgress(100)
        setStatus('success')
        console.log('⏳ Progress: 100% - Verification successful')

        // If already processed, redirect immediately
        if (result.isProcessed) {
          console.log('🔄 Setup already processed, redirecting immediately')
          router.push('/enrollment/success')
          return
        }

        // Wait for progress animation before redirect
        console.log('⏳ Waiting for animation before redirect')
        setTimeout(() => {
          console.log('➡️ Redirecting to success page')
          router.push('/enrollment/success')
        }, 1000)
      } catch (err: any) {
        console.error('❌ Verification error:', {
          error: err.message,
          timestamp: new Date().toISOString(),
        })
        setError(err.message || 'An unexpected error occurred')
        setStatus('error')
      }
    }

    handleVerification()
  }, [searchParams, router])

  const handleStartOver = async () => {
    const setupIntent = searchParams.get('setup_intent')
    console.log('🔄 Starting over enrollment process:', { setupIntent })

    if (!setupIntent) {
      console.log('➡️ No setupIntent, redirecting to enrollment start')
      actions.setStep(1)
      router.push('/enrollment')
      return
    }

    try {
      console.log('📡 Fetching previous enrollment data')
      const response = await fetch(
        `/api/get-enrollment-data?setupIntentId=${setupIntent}`
      )
      if (!response.ok) {
        throw new Error('Failed to retrieve enrollment data')
      }

      const data = await response.json()
      console.log('✅ Retrieved previous enrollment data:', {
        students: data.students.map((s: { name: any }) => s.name),
      })

      // Reset enrollment state with previous data
      actions.setStep(1)
      actions.setSelectedStudents(data.students)

      console.log('➡️ Redirecting to enrollment with restored data')
      router.push('/enrollment')
    } catch (err) {
      console.error('❌ Failed to retrieve enrollment data:', err)
      actions.setStep(1)
      router.push('/enrollment')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mb-4 flex justify-center"
            >
              {status === 'loading' && (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              )}
              {status === 'success' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                >
                  <CheckCircle2 className="h-12 w-12 text-primary" />
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                >
                  <XCircle className="h-12 w-12 text-destructive" />
                </motion.div>
              )}
            </motion.div>
            <CardTitle className="text-2xl">
              {status === 'loading' && 'Finalizing Your Payments'}
              {status === 'success' && 'Setup Complete!'}
              {status === 'error' && 'Setup Failed'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' &&
                'Please wait while we finalize your automatic payments.'}
              {status === 'success' &&
                'Your automatic payments have been set up successfully.'}
              {status === 'error' &&
                'We encountered an issue while setting up your payments.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <Progress value={progress} className="h-2" />
              <motion.div
                className={cn(
                  'absolute inset-0 h-2 rounded-full bg-primary/20',
                  status === 'error' && 'bg-destructive/20'
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>

            {status === 'loading' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Alert>
                  <AlertTitle>Finalizing Your Account</AlertTitle>
                  <AlertDescription>
                    We're setting up your subscription. This should only take a
                    moment.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Alert variant="default">
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>
                    Your automatic payments have been set up successfully. Your
                    first payment will be processed next month.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription className="space-y-4">
                    <p>{error}</p>
                    {canRetry ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          You have {attemptsLeft}{' '}
                          {attemptsLeft === 1 ? 'attempt' : 'attempts'}{' '}
                          remaining.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => window.location.reload()}
                          >
                            Try Again
                          </Button>
                          <Button variant="outline" onClick={handleStartOver}>
                            Start Over
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button variant="outline" onClick={handleStartOver}>
                        Return to Enrollment
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
