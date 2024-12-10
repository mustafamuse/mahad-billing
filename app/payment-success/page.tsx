'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import React from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const setupIntentId = searchParams.get('setupIntentId')

  useEffect(() => {
    if (!setupIntentId) return

    const verifySetup = async () => {
      try {
        const response = await fetch('/api/verify-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setupIntentId }),
        })
        const data = await response.json()
        setIsVerified(data.success)
      } catch (error) {
        console.error('Verification error:', error)
      }
    }

    verifySetup()
  }, [setupIntentId])

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Payment Setup Complete!</h1>
        <p className="text-muted-foreground">
          {isVerified
            ? 'Your payment method has been verified and your enrollment is complete.'
            : 'Your payment method is being verified...'}
        </p>
        <Button onClick={() => router.push('/')}>Return Home</Button>
      </div>
    </Card>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div className="container py-10">
      <Suspense
        fallback={
          <Card className="mx-auto max-w-lg p-6">
            <div className="space-y-6">
              <Skeleton className="mx-auto h-8 w-3/4" />
              <Skeleton className="mx-auto h-4 w-2/3" />
              <Skeleton className="mx-auto h-10 w-32" />
            </div>
          </Card>
        }
      >
        <PaymentSuccessContent />
      </Suspense>
    </div>
  )
}
