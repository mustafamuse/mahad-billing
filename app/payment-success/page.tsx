'use client'

import { useEffect, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerified, setIsVerified] = useState<boolean | null>(null)

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 5

    async function verifySetup() {
      const setupIntentId = searchParams.get('setupIntentId')
      if (!setupIntentId) {
        router.push('/')
        return
      }

      const response = await fetch('/api/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupIntentId }),
      })

      if (!response.ok) throw new Error('Verification failed')
      const { success } = await response.json()

      if (!success && retryCount < maxRetries) {
        retryCount++
        setTimeout(verifySetup, 2000)
        return
      }

      setIsVerified(success)
    }

    verifySetup()
  }, [router, searchParams])

  if (isVerified === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Verifying auto pay setup..." />
      </div>
    )
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
              Verification Failed
            </h1>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              We couldn't verify your enrollment. Please try again or contact
              support if the issue persists.
            </p>
            <button
              onClick={() => router.push('/')}
              className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
            >
              Return to Enrollment
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Auto-Pay Setup Complete! 🎉
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Your monthly Mahad fee payments have been successfully set up.
            <br />
            <br />
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Starting next month.. Mahad fee's will be automatically deducted
              from your bank account on the 1st of each month.
            </p>
          </p>
          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
            <p>Need to make changes or have questions?</p>
            <p className="mt-1">Contact Mahad Admin</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Return to Main Page
          </button>
        </div>
      </div>
    </div>
  )
}
