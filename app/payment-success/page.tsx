'use client'

import { useRouter } from 'next/navigation'

export default function PaymentSuccessPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Tuition Payment Successful!
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Thank you for completing your tuition payment! A confirmation email
            has been sent to your inbox. If you have any questions, feel free to
            contact us.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
