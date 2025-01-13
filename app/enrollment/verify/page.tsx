'use client'

import { useEffect, useRef, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { verifySetup } from '@/app/actions/verify-setup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setupIntent = searchParams.get('setup_intent')
  const verificationStarted = useRef(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [canRetry, setCanRetry] = useState(true)
  const [attemptsLeft, setAttemptsLeft] = useState(3)

  useEffect(() => {
    if (!setupIntent) {
      console.error('❌ Missing setupIntent in URL parameters')
      setError('Invalid verification request')
      return
    }

    async function checkSetupIntent() {
      try {
        // Check if verification has already started
        if (verificationStarted.current) {
          console.log('⏭️ Verification already started, skipping...')
          return
        }

        console.log('🔄 Starting verification process:', {
          setupIntent,
          timestamp: new Date().toISOString(),
        })

        // Start progress animation
        setProgress(30)
        console.log('⏳ Progress: 30% - Initiating verification')

        // Call verifySetup server action
        console.log('📡 Calling verifySetup server action')
        const result = await verifySetup(setupIntent!)
        console.log('✅ Verification result:', result)

        if (result.success) {
          if (result.isProcessed) {
            // Already processed, redirect immediately
            console.log('⏭️ Setup already processed, redirecting...')
            router.push('/enrollment/success')
            return
          }

          // Show success animation before redirecting
          setProgress(100)
          console.log('⏳ Progress: 100% - Verification successful')
          await new Promise((resolve) => setTimeout(resolve, 1000))
          router.push('/enrollment/success')
        } else {
          console.warn('⚠️ Verification failed:', {
            error: result.error,
            canRetry: result.canRetry,
            attemptsLeft: result.attemptsLeft,
          })
          setError(result.error || 'Verification failed')
          setCanRetry(result.canRetry ?? false)
          setAttemptsLeft(result.attemptsLeft ?? 0)
        }
      } catch (err) {
        console.error('❌ Verification error:', {
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
        setError(err instanceof Error ? err.message : 'Verification failed')
        setCanRetry(true)
        setAttemptsLeft(2) // One attempt used
      }
    }

    checkSetupIntent()
  }, [setupIntent, router])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {error ? (
                  <XCircle className="mx-auto h-12 w-12 text-destructive" />
                ) : progress === 100 ? (
                  <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
                ) : (
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {error ? (
                  <div className="mt-4 space-y-4">
                    <p className="text-lg font-medium text-destructive">
                      {error}
                    </p>
                    {canRetry && (
                      <p className="text-sm text-muted-foreground">
                        {attemptsLeft} attempts remaining
                      </p>
                    )}
                    <div className="flex justify-center space-x-4">
                      {canRetry && (
                        <Button
                          onClick={() => window.location.reload()}
                          variant="default"
                        >
                          Try Again
                        </Button>
                      )}
                      <Button
                        onClick={() => router.push('/enrollment')}
                        variant="secondary"
                      >
                        Start Over
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <p className="text-lg font-medium">
                      {progress === 100
                        ? 'Verification successful!'
                        : 'Verifying your enrollment...'}
                    </p>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </motion.div>
            </CardHeader>
            <CardContent>
              {!error && (
                <p className="text-center text-sm text-muted-foreground">
                  Please wait while we verify your enrollment. This may take a
                  few moments.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
