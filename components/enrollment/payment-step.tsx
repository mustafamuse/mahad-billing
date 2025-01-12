'use client'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js/pure'
import { type UseFormReturn } from 'react-hook-form'

import { EnrollmentSummary } from '@/components/enrollment/enrollment-summary'
import { StripePaymentForm } from '@/components/stripe-payment-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Review your enrollment summary and set up your bank account for
          monthly tuition payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-card p-6">
          <EnrollmentSummary selectedStudents={selectedStudents} />
        </div>

        <Separator className="my-6" />

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            formValues={formValues}
            billingDetails={billingDetails}
          />
        </Elements>

        <Button
          type="button"
          onClick={previousStep}
          variant="outline"
          className="w-full"
        >
          Back to Payor Details
        </Button>
      </CardContent>
    </Card>
  )
}
