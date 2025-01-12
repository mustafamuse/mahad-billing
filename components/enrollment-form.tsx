'use client'

import React, { useState } from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useForm } from 'react-hook-form'
import Stripe from 'stripe'

import { TermsModal } from '@/components/terms-modal'
import { toasts } from '@/components/toast/toast-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import {
  enrollmentSchema,
  enrollmentSchemaType,
} from '@/lib/schemas/enrollment'
import { stripeAppearance } from '@/lib/stripe-config'
import { Student } from '@/lib/types'

import { PaymentDetailsStep } from './enrollment/payment-details-step'
import { StepsProgress } from './enrollment/steps-progress'
import { StudentSelectionStep } from './enrollment/student-selection-step'
import { StripePaymentForm } from './stripe-payment-form'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface EnrollmentResponse {
  clientSecret: string
  customerId: string
  setupIntent: Stripe.Response<Stripe.SetupIntent>
}

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
  // Step and state management
  const [step, setStep] = useState(1)
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | undefined>()
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)

  const router = useRouter()

  // Utility function to reset form state
  const resetFormState = () => {
    setClientSecret(undefined)
    setIsProcessing(false)
    setStep(2)
  }
  // Form setup with Zod validation
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

  // Handle terms agreement
  const handleTermsAgreement = () => {
    setHasAgreedToTerms(true)
    setIsTermsModalOpen(false)
    form.setValue('termsAccepted', true, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  // Handle form submission
  const handleSubmit = async (values: enrollmentSchemaType) => {
    console.log('Form Submission Started:', { values, step })

    if (step === 1) {
      return handleStudentSelection()
    }

    if (step === 2) {
      return await handleEnrollment(values)
    }
  }

  // Handle Student Selection in Step 1
  const handleStudentSelection = () => {
    console.log('Step 1 Student Selection:', { selectedStudents })
    if (selectedStudents.length === 0) {
      toasts.apiError({
        title: 'No Students Selected',
        error: new Error(
          'Please select at least one student to proceed with enrollment.'
        ),
      })
      return
    }
    setStep(2)
    toasts.success(
      'Autopaying',
      `${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''}`
    )
  }

  // Handle Enrollment in Step 2
  const handleEnrollment = async (values: enrollmentSchemaType) => {
    try {
      if (isProcessing) return // Prevent duplicate requests
      setIsProcessing(true) // Lock the submission process
      const requestBody = {
        total: selectedStudents.reduce((sum, s) => sum + s.monthlyRate, 0),
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        students: selectedStudents,
      }
      console.log('Enrollment Request:', requestBody)

      const idempotencyKey = `${values.email}-${Date.now()}` // Unique key

      const response = await fetch('/api/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(
          (await response.text()) || 'Failed to create SetupIntent'
        )
      }

      const { clientSecret, customerId, setupIntent } =
        (await response.json()) as EnrollmentResponse
      console.log(
        'SetupIntent Client Secret:',
        clientSecret,
        'for customer: ',
        customerId,
        'with setupIntent: ',
        setupIntent
      )
      setClientSecret(clientSecret)
      setStep(3)
    } catch (error) {
      toasts.apiError({ error })
      console.error('Enrollment API Error:', error)
    } finally {
      setIsProcessing(false) // Unlock the submission process
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <StepsProgress currentStep={step} steps={steps} />

      <div className="space-y-8">
        {clientSecret ? (
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
                    router.push(
                      `/payment-success?setupIntentId=${setupIntentId}`
                    )
                  }}
                  onError={(error) => {
                    console.error('❌ Stripe Payment Form Error:', error)
                    toasts.apiError({
                      title: 'Payment Setup Failed',
                      error: error,
                    })
                    resetFormState()
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
              {step === 1 && (
                <StudentSelectionStep
                  selectedStudents={selectedStudents}
                  setSelectedStudents={setSelectedStudents}
                  form={form}
                  onSubmit={handleStudentSelection}
                />
              )}

              {step === 2 && (
                <PaymentDetailsStep
                  form={form}
                  isProcessing={isProcessing}
                  hasViewedTerms={hasAgreedToTerms}
                  onBack={() => setStep(1)}
                  onOpenTerms={() => setIsTermsModalOpen(true)}
                />
              )}
            </form>
          </Form>
        )}
      </div>

      <TermsModal
        open={isTermsModalOpen}
        onOpenChange={setIsTermsModalOpen}
        onAgree={handleTermsAgreement}
      />
    </div>
  )
}
