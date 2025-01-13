'use client'

import React from 'react'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Loader2 } from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'

import { EnrollmentSummary } from '@/components/enrollment/enrollment-summary'
import { StripePaymentForm } from '@/components/stripe-payment-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useEnrollment } from '@/contexts/enrollment-context'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface PaymentStepProps {
  form: UseFormReturn<{
    students: string[]
    relationship:
      | 'self'
      | 'father'
      | 'mother'
      | 'sibling'
      | 'uncle'
      | 'aunt'
      | 'step-father'
      | 'step-mother'
      | 'other'
    firstName: string
    lastName: string
    email: string
    phone: string
    termsAccepted: boolean
    setupIntentId?: string
  }>
}

export function PaymentStep(_props: PaymentStepProps) {
  const {
    state: { step, clientSecret, selectedStudents, formValues },
  } = useEnrollment()
  const options = {
    clientSecret: clientSecret || '',
  }

  // Skip rendering the form if we've moved past step 3
  if (step > 3) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Set up automatic monthly tuition payments from your bank account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4">
          <EnrollmentSummary selectedStudents={selectedStudents} />
        </div>
        <Separator />
        {clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <>
              {console.log('PaymentStep - payorDetails:', {
                formValues,
                payorDetails: {
                  email: formValues?.email ?? '',
                  name: `${formValues?.firstName ?? ''} ${formValues?.lastName ?? ''}`.trim(),
                  phone: formValues?.phone ?? '',
                },
              })}
              <StripePaymentForm
                clientSecret={clientSecret}
                payorDetails={{
                  email: formValues?.email ?? '',
                  name: `${formValues?.firstName ?? ''} ${formValues?.lastName ?? ''}`.trim(),
                  phone: formValues?.phone ?? '',
                }}
              />
            </>
          </Elements>
        ) : (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
