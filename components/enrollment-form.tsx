'use client'

import { EnrollmentHeader } from '@/components/enrollment/enrollment-header'
import { PaymentStep } from '@/components/enrollment/payment-step'
import { PayorDetailsStep } from '@/components/enrollment/payor-details-step'
import { StudentSelectionStep } from '@/components/enrollment/student-selection-step'
import {
  EnrollmentProvider,
  useEnrollment,
} from '@/contexts/enrollment-context'
import { type Student } from '@/lib/types'

// The EnrollmentForm component
interface EnrollmentFormProps {
  students: Student[]
}

export function EnrollmentForm({ students }: EnrollmentFormProps) {
  return (
    <EnrollmentProvider>
      <div className="mx-auto max-w-3xl space-y-8">
        <EnrollmentHeader />
        <EnrollmentSteps students={students} />
      </div>
    </EnrollmentProvider>
  )
}

function EnrollmentSteps({ students }: { students: Student[] }) {
  const { state } = useEnrollment()

  console.log('EnrollmentSteps render', {
    currentStep: state.step,
    selectedStudents: state.selectedStudents,
  })

  // Render the appropriate step based on state.step
  switch (state.step) {
    case 0:
      return <StudentSelectionStep students={students} />
    case 1:
      return <PayorDetailsStep />
    case 2:
      return <PaymentStep />
    default:
      return null
  }
}
