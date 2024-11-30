'use client'

import * as React from 'react'

import { useRouter } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { TermsModal } from '@/components/terms-modal'
import { toasts } from '@/components/toast/toast-utils'
import { Card, CardContent } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Steps, Step } from '@/components/ui/steps'
import { stripeAppearance } from '@/lib/stripe-config'
import { Student } from '@/lib/types'
import { calculateTotal } from '@/lib/utils'

import { PaymentDetailsStep } from './enrollment/payment-details-step'
import { StudentSelectionStep } from './enrollment/student-selection-step'
import { StripePaymentForm } from './stripe-payment-form'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface EnrollmentResponse {
  clientSecret: string
}

// Form schema
const formSchema = z.object({
  students: z.array(z.string()).min(1, 'Please select at least one student'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  termsAccepted: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

export function EnrollmentForm() {
  // State management
  const [step, setStep] = React.useState(1)
  const [selectedStudents, setSelectedStudents] = React.useState<Student[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [clientSecret, setClientSecret] = React.useState<string>()
  const [termsModalOpen, setTermsModalOpen] = React.useState(false)
  const [hasViewedTerms, setHasViewedTerms] = React.useState(false)

  const router = useRouter()

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    console.log('Form submission started', { values, step })

    if (step === 1) {
      console.log('Step 1 validation', { selectedStudents })
      if (selectedStudents.length === 0) {
        toasts.apiError({
          title: 'No Students Selected',
          error: new Error(
            'Please select at least one student to proceed with enrollment.'
          ),
        })
        return
      }
      console.log('Moving to step 2')
      setStep(2)
      toasts.success(
        'Students Selected',
        `Selected ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} for enrollment.`
      )
      return
    }

    // Only proceed with API call if we're on step 2
    if (step === 2) {
      try {
        setIsProcessing(true)
        const promise = fetch('/api/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total: calculateTotal(selectedStudents),
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            students: selectedStudents,
          }),
        })

        await toasts.promise(promise, {
          loading: 'Setting up your enrollment...',
          success: 'Enrollment setup complete',
          error: 'Failed to setup enrollment',
        })

        const response = await promise
        if (!response.ok) {
          throw new Error(
            (await response.text()) || 'Failed to create SetupIntent'
          )
        }

        const { clientSecret } = (await response.json()) as EnrollmentResponse
        setClientSecret(clientSecret)
        setStep(3)
      } catch (error) {
        toasts.apiError({ error })
      } finally {
        setIsProcessing(false)
      }
    }
  }

  // Terms modal handlers
  const handleTermsModalChange = (open: boolean) => {
    setTermsModalOpen(open)
    if (!open && !hasViewedTerms) {
      form.setValue('termsAccepted', false)
    }
  }

  const handleTermsAgree = () => {
    setHasViewedTerms(true)
    form.setValue('termsAccepted', true, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    })
    toasts.success('Terms Accepted', 'You can now proceed with the enrollment.')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-2 sm:space-y-8 sm:p-4">
      <Steps className="mb-6 sm:mb-8">
        <Step isActive={step === 1}>Select Students</Step>
        <Step isActive={step === 2}>Payment Details</Step>
      </Steps>

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
                onSuccess={() => {
                  toasts.success(
                    'Payment Setup Successful',
                    'Your enrollment is complete! Redirecting you to the success page.'
                  )
                  router.push('/payment-success')
                }}
                onError={(error) => {
                  toasts.apiError({
                    title: 'Payment Setup Failed',
                    error: new Error(
                      'There was an issue connecting your bank account. Please try again.'
                    ),
                  })
                  setClientSecret(undefined)
                  setIsProcessing(false)
                  setStep(2)
                  console.error('Bank connection error:', error)
                }}
              />
            </Elements>
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 sm:space-y-8"
          >
            {step === 1 && (
              <StudentSelectionStep
                selectedStudents={selectedStudents}
                setSelectedStudents={setSelectedStudents}
                form={form}
                onSubmit={onSubmit}
              />
            )}

            {step === 2 && (
              <PaymentDetailsStep
                form={form}
                isProcessing={isProcessing}
                hasViewedTerms={hasViewedTerms}
                onBack={() => setStep(1)}
                onOpenTerms={() => setTermsModalOpen(true)}
              />
            )}
          </form>
        </Form>
      )}

      <TermsModal
        open={termsModalOpen}
        onOpenChange={handleTermsModalChange}
        onAgree={handleTermsAgree}
      />
    </div>
  )
}
