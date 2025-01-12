'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js/pure'
import { type UseFormReturn } from 'react-hook-form'

import { EnrollmentSummary } from '@/components/enrollment/enrollment-summary'
import { StripePaymentForm } from '@/components/stripe-payment-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useEnrollment } from '@/contexts/enrollment-context'
import { type EnrollmentFormValues } from '@/lib/schemas/enrollment'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface PaymentStepProps {
  form: UseFormReturn<EnrollmentFormValues>
}

export function PaymentStep({ form }: PaymentStepProps) {
  const {
    state: { clientSecret, selectedStudents },
    actions: { previousStep },
  } = useEnrollment()

  if (!clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setting up payment...</CardTitle>
          <CardDescription>
            Please wait while we prepare the payment form.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const formValues = form.getValues()
  const billingDetails = {
    name: `${formValues.firstName} ${formValues.lastName}`,
    email: formValues.email,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Bank Account</CardTitle>
        <CardDescription>
          Please provide your bank account details to complete enrollment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <EnrollmentSummary selectedStudents={selectedStudents} />

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            formValues={formValues}
            billingDetails={billingDetails}
          />
        </Elements>

        <button
          type="button"
          onClick={previousStep}
          className="inline-flex h-12 w-full items-center justify-center rounded-md border border-input bg-background px-6 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Back to Payor Details
        </button>
      </CardContent>
    </Card>
  )
}
