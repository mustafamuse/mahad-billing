'use client'

import { useState } from 'react'

import { useStripe } from '@stripe/react-stripe-js'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useEnrollment } from '@/contexts/enrollment-context'

interface BankVerificationButtonProps {
  className?: string
}

export function BankVerificationButton({
  className,
}: BankVerificationButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const stripe = useStripe()
  const {
    state: { clientSecret },
  } = useEnrollment()

  const handleVerification = async () => {
    if (!stripe || !clientSecret) {
      console.error('Stripe not initialized or client secret missing')
      return
    }

    setIsVerifying(true)
    try {
      const { error } = await stripe.verifyMicrodepositsForSetup(clientSecret)
      if (error) {
        console.error('Verification error:', error)
        throw error
      }
    } catch (err) {
      console.error('Failed to verify bank account:', err)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={handleVerification}
      disabled={isVerifying || !stripe || !clientSecret}
    >
      {isVerifying ? (
        <>
          <Spinner className="mr-2 h-4 w-4" />
          Verifying...
        </>
      ) : (
        <>
          <Lock className="mr-2 h-4 w-4" />
          Verify Bank Account
        </>
      )}
    </Button>
  )
}
