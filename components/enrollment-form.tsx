'use client'

import React from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useForm } from 'react-hook-form'

import { TermsModal } from '@/components/terms-modal'
import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { useEnrollment } from '@/contexts/enrollment-context'
import {
  enrollmentSchema,
  enrollmentSchemaType,
} from '@/lib/schemas/enrollment'
import { stripeAppearance } from '@/lib/stripe-config'

import { PaymentDetailsStep } from './enrollment/payment-details-step'
import { StepsProgress } from './enrollment/steps-progress'
import { StudentSelectionStep } from './enrollment/student-selection-step'
import { StripePaymentForm } from './stripe-payment-form'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

const steps = [
  {
    id: 1,
    label: 'Select Students',
    description: 'Choose students to enroll',
  },
  {
    id: 2,
    label: 'Payment Details',
    description: 'Enter bank account information',
  },
  {
    id: 3,
    label: 'Review & Confirm',
    description: 'Verify enrollment details',
  },
]

export function EnrollmentForm() {
  const router = useRouter()
  const {
    state: {
      step,
      selectedStudents,
      isProcessing,
      clientSecret,
      hasAgreedToTerms,
      isTermsModalOpen,
    },
    actions: {
      setStep,
      handleEnrollment,
      handleTermsAgreement,
      toggleTermsModal,
    },
  } = useEnrollment()

  const form = useForm<enrollmentSchemaType>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      students: [],
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      termsAccepted: false,
    },
    mode: 'onChange',
  })

  const handleSubmit = async (values: enrollmentSchemaType) => {
    if (step === 1 && selectedStudents.length > 0) {
      setStep(2)
      return
    }

    if (step === 2) {
      await handleEnrollment(values)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <StepsProgress currentStep={step} steps={steps} />

      {step === 3 && clientSecret ? (
        <Card className="border-0 sm:border">
          <CardContent className="p-4 sm:p-6">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: stripeAppearance,
                loader: 'auto',
              }}
            >
              <StripePaymentForm
                clientSecret={clientSecret}
                customerName={`${form.getValues('firstName')} ${form.getValues('lastName')}`}
                customerEmail={form.getValues('email')}
                onSuccess={({ setupIntentId }) => {
                  router.push(`/payment-success?setupIntentId=${setupIntentId}`)
                }}
                onError={(error) => {
                  console.error('❌ Stripe Payment Form Error:', error)
                  setStep(2)
                }}
              />
            </Elements>
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 sm:space-y-8"
          >
            {step === 1 && <StudentSelectionStep form={form} />}

            {step === 2 && (
              <PaymentDetailsStep
                form={form}
                isProcessing={isProcessing}
                hasViewedTerms={hasAgreedToTerms}
                onBack={() => setStep(1)}
                onOpenTerms={toggleTermsModal}
              />
            )}
          </form>
        </Form>
      )}

      <TermsModal
        open={isTermsModalOpen}
        onOpenChange={toggleTermsModal}
        onAgree={handleTermsAgreement}
      />
    </div>
  )
}
