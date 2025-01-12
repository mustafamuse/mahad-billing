// StripePaymentForm.jsx
'use client'

import { useState } from 'react'

import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import {
  type StripeError,
  type SetupIntent,
  type StripePaymentElementChangeEvent,
} from '@stripe/stripe-js'
import { AlertCircle, Info } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

// Common bank setup error messages with solutions
const ERROR_MESSAGES = {
  'account-number-invalid': {
    title: 'Invalid Account Number',
    message:
      'Please check your account number and try again. It should be between 4-17 digits.',
  },
  'routing-number-invalid': {
    title: 'Invalid Routing Number',
    message:
      "The routing number you entered is invalid. Please verify your bank's 9-digit routing number.",
  },
  'account-closed': {
    title: 'Account Closed',
    message:
      'This bank account appears to be closed. Please use a different active account.',
  },
  'insufficient-funds': {
    title: 'Insufficient Funds',
    message:
      'Please ensure your account has sufficient funds for verification.',
  },
  'bank-account-restricted': {
    title: 'Account Restricted',
    message:
      'This account cannot accept ACH debits. Please contact your bank or use a different account.',
  },
  'bank-account-declined': {
    title: 'Bank Declined',
    message:
      'Your bank declined this setup. Please verify your account can accept automatic payments or try a different account.',
  },
  'verification-failed': {
    title: 'Verification Failed',
    message:
      "We couldn't verify this account. Please double-check your information or try a different account.",
  },
  default: {
    title: 'Setup Error',
    message:
      'There was a problem setting up your bank account. Please try again or contact support if the issue persists.',
  },
} as const

export function StripePaymentForm({
  formValues,
  billingDetails,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const [errorCode, setErrorCode] = useState<keyof typeof ERROR_MESSAGES | ''>(
    ''
  )
  const [isComplete, setIsComplete] = useState(false)
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
    setErrorCode('')

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
        // Map Stripe error codes to our custom error messages
        const code =
          (result.error.code as keyof typeof ERROR_MESSAGES) || 'default'
        setErrorCode(code)
        setError(result.error.message)
        return
      }

      if (!result.setupIntent?.id) {
        throw new Error('Failed to create setup intent')
      }

      await handleEnrollment({
        ...formValues,
        setupIntentId: result.setupIntent.id,
      })

      console.log('Bank account setup successful:', result.setupIntent)
    } catch (err) {
      console.error('Error setting up bank account:', err)
      setErrorCode('default')
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium">Select Your Bank</h3>
        <p className="text-sm text-muted-foreground">
          Please search and select your bank from the list below to continue.
        </p>
      </div>

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
        onChange={(event: StripePaymentElementChangeEvent) => {
          setIsComplete(event.complete)
          setErrorCode('')
        }}
      />

      {error && errorCode && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES].title}
          </AlertTitle>
          <AlertDescription className="mt-2">
            {ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES].message}
          </AlertDescription>
        </Alert>
      )}

      {!isComplete && !error && (
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please select your bank to enable the setup button
          </AlertDescription>
        </Alert>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing || !isComplete}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        {isProcessing ? 'Setting up...' : 'Set Up Bank Account'}
      </button>
    </form>
  )
}
