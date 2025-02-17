'use client'

import { EnrollmentHeader } from '@/app/autopay/(enrollment)/enrollment-header'
import { PaymentStep } from '@/app/autopay/(payment-step)/payment-step'
import { PayorDetailsStep } from '@/app/autopay/(payor-details-step)/payor-details-step'
import { StudentSelectionStep } from '@/app/autopay/(student-selection-step)/student-selection-step'
import { Footer } from '@/components/footer'
import {
  EnrollmentProvider,
  useEnrollment,
} from '@/contexts/enrollment-context'

export function EnrollmentForm() {
  return (
    <EnrollmentProvider>
      <div className="mx-auto max-w-3xl space-y-8">
        <EnrollmentHeader />
        <EnrollmentSteps />
      </div>
      <Footer showButtons={true} />
    </EnrollmentProvider>
  )
}

function EnrollmentSteps() {
  const { state } = useEnrollment()

  console.log('EnrollmentSteps render', {
    currentStep: state.step,
    selectedStudents: state.selectedStudents,
  })

  // Render the appropriate step based on state.step
  switch (state.step) {
    case 0:
      return <StudentSelectionStep />
    case 1:
      return <PayorDetailsStep />
    case 2:
      return <PaymentStep />
    default:
      return null
  }
}
