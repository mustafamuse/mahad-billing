'use client'

import { createContext, useContext, useState } from 'react'

import { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'

import { StudentDTO } from '@/lib/actions/get-students'
import { type EnrollmentFormValues } from '@/lib/schemas/enrollment'
import { PayorDetails } from '@/lib/types'

// 1. Define Types
type EnrollmentStatus = 'draft' | 'confirming' | 'confirmed' | 'failed'

interface PrepareSetupResponse {
  clientSecret: string
  customerId: string
  setupIntent: any
  enrollment: {
    payorId: string
    studentIds: string[]
  }
}

interface EnrollmentState {
  step: number
  selectedStudents: StudentDTO[]
  payorDetails: PayorDetails | null
  status: EnrollmentStatus
  clientSecret: string | null
  customerId: string | null
  setupIntent: any | null
  isProcessing: boolean
  hasViewedTerms: boolean
  isTermsModalOpen: boolean
  error: string | null
  formData: Partial<EnrollmentFormValues>
}

interface EnrollmentActions {
  setStep: (step: number) => void
  previousStep: () => void
  nextStep: () => void
  updateSelectedStudents: (students: StudentDTO[]) => void
  updatePayorDetails: (details: PayorDetails) => void
  finalizeEnrollment: (values: EnrollmentFormValues) => Promise<void>
  handleTermsAgreement: (form: UseFormReturn<EnrollmentFormValues>) => void
  toggleTermsModal: () => void
  prepareSetup: (data: {
    payerDetails: {
      firstName: string
      lastName: string
      email: string
      phone: string
      relationship: string
    }
    studentIds: string[]
    termsAccepted: boolean
  }) => Promise<void>
  resetForm: () => void
  updateFormData: (data: Partial<EnrollmentFormValues>) => void
}

interface EnrollmentContextType {
  state: EnrollmentState
  actions: EnrollmentActions
  form?: UseFormReturn<EnrollmentFormValues>
}

// 2. Create Context
const EnrollmentContext = createContext<EnrollmentContextType | undefined>(
  undefined
)

// 3. Initial State
const initialState: EnrollmentState = {
  step: 0,
  selectedStudents: [],
  payorDetails: null,
  status: 'draft',
  clientSecret: null,
  customerId: null,
  setupIntent: null,
  isProcessing: false,
  hasViewedTerms: false,
  isTermsModalOpen: false,
  error: null,
  formData: {},
}

// 4. Provider Component
export function EnrollmentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, setState] = useState<EnrollmentState>({
    ...initialState,
    selectedStudents: [] as StudentDTO[],
  })

  // 5. Define Actions
  const actions: EnrollmentActions = {
    setStep: (step: number) => {
      setState((prev) => ({ ...prev, step }))
    },

    previousStep: () => {
      setState((prev) => ({ ...prev, step: Math.max(0, prev.step - 1) }))
    },

    nextStep: () => {
      setState((prev) => ({ ...prev, step: prev.step + 1 }))
    },

    updateSelectedStudents: (students: StudentDTO[]) => {
      setState((prev) => ({ ...prev, selectedStudents: students }))
    },

    updatePayorDetails: (details: PayorDetails) => {
      console.log('EnrollmentContext - updatePayorDetails:', {
        firstName: {
          value: details.firstName,
          length: details.firstName ? details.firstName.length : 0,
          isEmpty: !details.firstName || details.firstName === '',
        },
        lastName: {
          value: details.lastName,
          length: details.lastName ? details.lastName.length : 0,
          isEmpty: !details.lastName || details.lastName === '',
        },
        email: details.email,
        phone: details.phone,
        relationship: details.relationship,
      })
      setState((prev) => ({ ...prev, payorDetails: details }))
    },

    prepareSetup: async (data) => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }))

      try {
        const response = await fetch('/api/enrollment/prepare-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to prepare setup')
        }

        const result: PrepareSetupResponse = await response.json()

        setState((prev) => ({
          ...prev,
          clientSecret: result.clientSecret,
          customerId: result.customerId,
          setupIntent: result.setupIntent,
          isProcessing: false,
        }))
      } catch (error) {
        console.error('Failed to prepare setup:', error)
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Failed to prepare setup',
          isProcessing: false,
        }))
        throw error
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    finalizeEnrollment: async (_values: EnrollmentFormValues) => {
      setState((prev) => ({
        ...prev,
        status: 'confirming',
        isProcessing: true,
        error: null,
      }))

      try {
        // We'll implement the API call later
        // For now, just the state management
        setState((prev) => ({
          ...prev,
          status: 'confirmed',
        }))

        toast.success('Enrollment completed successfully!')
      } catch (error) {
        console.error('Enrollment failed:', error)
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Enrollment failed',
        }))
        toast.error(
          error instanceof Error ? error.message : 'Enrollment failed'
        )
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }))
      }
    },

    handleTermsAgreement: (form: UseFormReturn<EnrollmentFormValues>) => {
      setState((prev) => ({ ...prev, hasViewedTerms: true }))
      form.setValue('termsAccepted', true)
    },

    toggleTermsModal: () => {
      setState((prev) => ({
        ...prev,
        isTermsModalOpen: !prev.isTermsModalOpen,
      }))
    },

    resetForm: () => {
      setState(initialState)
    },

    updateFormData: (data: Partial<EnrollmentFormValues>) => {
      setState((prev) => ({ ...prev, formData: { ...prev.formData, ...data } }))
    },
  }

  // 6. Create Context Value
  const value = { state, actions }

  // 7. Return Provider
  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  )
}

// 8. Custom Hook
export function useEnrollment() {
  const context = useContext(EnrollmentContext)
  if (context === undefined) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider')
  }
  return context
}
