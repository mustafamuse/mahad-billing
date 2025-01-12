'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { PaymentStep } from '@/components/enrollment/payment-step'
import { PayorDetailsStep } from '@/components/enrollment/payor-details-step'
import { StudentSelectionStep } from '@/components/enrollment/student-selection-step'
import { Form } from '@/components/ui/form'
import { useEnrollment } from '@/contexts/enrollment-context'
import {
  enrollmentSchema,
  type EnrollmentFormValues,
} from '@/lib/schemas/enrollment'

export function EnrollmentForm() {
  const {
    state: { step },
    actions: { handleEnrollment },
  } = useEnrollment()

  const form = useForm<EnrollmentFormValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      students: [],
      relationship: undefined,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      termsAccepted: false,
    },
    mode: 'onChange',
  })

  const onSubmit = async (values: EnrollmentFormValues) => {
    await handleEnrollment(values)
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-16">
      <div className="mb-8 flex flex-col items-center text-center">
        <GraduationCap className="mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-3 text-4xl font-bold">Set Up Your Mahad Payment</h1>
        <p className="max-w-[42rem] text-muted-foreground">
          Welcome to Irshād Mahad's tuition payment portal. Use this app to set
          up your monthly tuition payments easily and securely. Simply select
          your name and complete the payment process.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {step === 1 ? (
              <StudentSelectionStep form={form} />
            ) : step === 2 ? (
              <PayorDetailsStep form={form} />
            ) : (
              <PaymentStep form={form} />
            )}
          </form>
        </Form>
      </div>
    </div>
  )
}
