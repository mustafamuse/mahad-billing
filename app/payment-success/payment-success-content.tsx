'use client'

import { useRef } from 'react'
import { useEffect, useState } from 'react'
import React from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
// import { Skeleton } from '@/components/ui/skeleton'

export default function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [statusMessage, setStatusMessage] = useState(
    'Your payment method is being verified...'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)

  const setupIntentId = React.useMemo(
    () => searchParams?.get('setupIntentId'),
    [searchParams]
  )
  const hasCalledAPI = useRef(false)

  useEffect(() => {
    if (!setupIntentId || hasCalledAPI.current) return

    const processSubscriptionAndVerify = async () => {
      try {
        hasCalledAPI.current = true
        setIsLoading(true)
        setHasFailed(false)

        const subscriptionResponse = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupIntentId, oneTimeCharge: false }),
        })

        if (!subscriptionResponse.ok) {
          const errorText = await subscriptionResponse.text()
          console.error('Subscription API returned an error:', errorText)
          setStatusMessage(
            errorText ||
              'Failed to verify your payment method. Please try again.'
          )
          setHasFailed(true)
          setIsVerified(false)
          return
        }

        let subscriptionData
        try {
          subscriptionData = await subscriptionResponse.json()
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError)
          setStatusMessage(
            'An unexpected error occurred. Please try again later.'
          )
          setHasFailed(true)
          setIsVerified(false)
          return
        }

        if (!subscriptionData.success) {
          console.error(
            'Subscription creation failed:',
            subscriptionData.error || 'Unknown error'
          )
          setStatusMessage(
            subscriptionData.error ||
              'Failed to verify your payment method. Please try again.'
          )
          setHasFailed(true)
          setIsVerified(false)
          return
        }

        setStatusMessage(
          'Your payment method has been verified and your enrollment is complete.'
        )
        setIsVerified(true)
        setHasFailed(false)
      } catch (error) {
        console.error(
          'Error during subscription and verification process:',
          error
        )
        setStatusMessage(
          'An error occurred while verifying your payment. Please try again.'
        )
        setHasFailed(true)
        setIsVerified(false)
      } finally {
        setIsLoading(false)
      }
    }

    processSubscriptionAndVerify()
  }, [setupIntentId])

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold">
          {isVerified
            ? 'Enrollment Complete!'
            : hasFailed
              ? 'Payment Verification Failed'
              : 'Payment Setup in Progress'}
        </h1>

        <p className="text-muted-foreground">{statusMessage}</p>

        {hasFailed && (
          <p className="text-red-500">
            There was an issue verifying your payment. Please try to re-enroll.
          </p>
        )}

        <Button
          onClick={() => router.push('/')}
          disabled={isLoading}
          variant={hasFailed ? 'destructive' : 'default'}
        >
          {isVerified ? 'Go to Dashboard' : 'Return Home'}
        </Button>
      </div>
    </Card>
  )
}
