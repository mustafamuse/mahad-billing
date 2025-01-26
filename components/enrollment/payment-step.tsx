'use client'

import React from 'react'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  BadgeCheck,
  Banknote,
  Loader2,
  LockIcon,
  ShieldCheck,
} from 'lucide-react'
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
    actions,
  } = useEnrollment()

  const options = {
    clientSecret: clientSecret || '',
  }

  const handleAddStudents = () => {
    actions.setStep(1) // Go back to student selection step
  }

  // Skip rendering the form if we've moved past step 3
  if (step > 3) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="mb-8 flex justify-center">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium">Student Info</div>
          <div className="h-0.5 w-12 bg-gray-200" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium">Contact Info</div>
          <div className="h-0.5 w-12 bg-gray-200" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            <Banknote className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-primary">Payment Setup</div>
        </div>
      </div>

      <Card className="relative">
        <div className="absolute right-4 top-4 flex items-center text-sm text-muted-foreground">
          <LockIcon className="mr-1 h-4 w-4" />
          Secure Payment
        </div>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription className="mt-2">
            Set up automatic monthly tuition payments from your bank account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <EnrollmentSummary
              selectedStudents={selectedStudents}
              onAddStudents={handleAddStudents}
            />
          </div>

          {/* Payment Info */}
          <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium">Payment Information</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center">
                <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                Secure bank-to-bank transfer (ACH)
              </li>
              <li className="flex items-center">
                <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                No processing fees
              </li>
              <li className="flex items-center">
                <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                Cancel anytime with no penalties
              </li>
            </ul>
          </div>

          <Separator />

          {clientSecret ? (
            <Elements stripe={stripePromise} options={options}>
              <StripePaymentForm
                clientSecret={clientSecret}
                payorDetails={{
                  email: formValues?.email ?? '',
                  name: `${formValues?.firstName ?? ''} ${formValues?.lastName ?? ''}`.trim(),
                  phone: formValues?.phone ?? '',
                }}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">
              When will this payment be processed?
            </h3>
            <p className="text-sm text-muted-foreground">
              This payment will be processed in a few days.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Is my information secure?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, all payment information is securely processed by Stripe, a
              leading payment processor. We never store your bank details.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">
              What if I need to update my payment method?
            </h3>
            <p className="text-sm text-muted-foreground">
              You can update your payment method at any time by contacting Mahad
              Admin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
