// StripePaymentForm.jsx
'use client'

import { useState } from 'react'

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { type StripeError, type SetupIntent } from '@stripe/stripe-js'

import { useEnrollment } from '@/contexts/enrollment-context'
import { type EnrollmentFormValues } from '@/lib/schemas/enrollment'

interface StripePaymentFormProps {
  formValues: EnrollmentFormValues
  billingDetails: {
    name: string
    email: string
  }
}

interface SetupResponse {
  error?: StripeError
  setupIntent?: SetupIntent
}

export function StripePaymentForm({
  formValues,
  billingDetails,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const {
    actions: { handleEnrollment },
  } = useEnrollment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(undefined)

    try {
      const result = (await stripe.confirmSetup({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: billingDetails,
          },
          return_url: `${window.location.origin}/enrollment/success`,
        },
      })) as SetupResponse

      if (result.error) {
        setError(result.error.message)
        return
      }

      if (!result.setupIntent?.id) {
        throw new Error('Failed to create setup intent')
      }

      // Complete enrollment with the setupIntent ID
      await handleEnrollment({
        ...formValues,
        setupIntentId: result.setupIntent.id,
      })

      console.log('Bank account setup successful:', result.setupIntent)
    } catch (err) {
      console.error('Error setting up bank account:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          defaultValues: {
            billingDetails,
          },
          fields: {
            billingDetails: {
              name: 'never',
              email: 'never',
            },
          },
        }}
      />

      {error && (
        <div className="mt-4 text-sm text-red-500" role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {isProcessing ? 'Setting up...' : 'Set Up Bank Account'}
      </button>
    </form>
  )
}
