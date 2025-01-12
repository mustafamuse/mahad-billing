'use client'

import { createContext, useContext, useState, useCallback } from 'react'

import { toasts } from '@/components/toast/toast-utils'
import { enrollmentSchemaType } from '@/lib/schemas/enrollment'
import { Student } from '@/lib/types'

interface EnrollmentState {
  step: number
  selectedStudents: Student[]
  isProcessing: boolean
  clientSecret?: string
  hasAgreedToTerms: boolean
  isTermsModalOpen: boolean
}

interface EnrollmentActions {
  nextStep: () => void
  previousStep: () => void
  setStep: (step: number) => void
  addStudent: (student: Student) => void
  removeStudent: (studentId: string) => void
  setSelectedStudents: (students: Student[]) => void
  handleTermsAgreement: () => void
  toggleTermsModal: () => void
  handleEnrollment: (values: enrollmentSchemaType) => Promise<void>
  resetForm: () => void
}

interface EnrollmentContextType {
  state: EnrollmentState
  actions: EnrollmentActions
}

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(
  undefined
)

export function EnrollmentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // State
  const [state, setState] = useState<EnrollmentState>({
    step: 1,
    selectedStudents: [],
    isProcessing: false,
    clientSecret: undefined,
    hasAgreedToTerms: false,
    isTermsModalOpen: false,
  })

  // Actions
  const nextStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: prev.step + 1 }))
  }, [])

  const previousStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: prev.step - 1 }))
  }, [])

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const addStudent = useCallback((student: Student) => {
    setState((prev) => ({
      ...prev,
      selectedStudents: [...prev.selectedStudents, student],
    }))
  }, [])

  const removeStudent = useCallback((studentId: string) => {
    setState((prev) => ({
      ...prev,
      selectedStudents: prev.selectedStudents.filter((s) => s.id !== studentId),
    }))
  }, [])

  const setSelectedStudents = useCallback((students: Student[]) => {
    setState((prev) => ({ ...prev, selectedStudents: students }))
  }, [])

  const handleTermsAgreement = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasAgreedToTerms: true,
      isTermsModalOpen: false,
    }))
  }, [])

  const toggleTermsModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTermsModalOpen: !prev.isTermsModalOpen,
    }))
  }, [])

  const handleEnrollment = useCallback(
    async (values: enrollmentSchemaType) => {
      try {
        setState((prev) => ({ ...prev, isProcessing: true }))

        const requestBody = {
          total: state.selectedStudents.reduce(
            (sum, s) => sum + s.monthlyRate,
            0
          ),
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          students: state.selectedStudents,
        }

        const response = await fetch('/api/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(
            (await response.text()) || 'Failed to create SetupIntent'
          )
        }

        const { clientSecret } = await response.json()
        setState((prev) => ({
          ...prev,
          clientSecret,
          step: 3,
        }))
      } catch (error) {
        toasts.apiError({ error })
        console.error('Enrollment API Error:', error)
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }))
      }
    },
    [state.selectedStudents]
  )

  const resetForm = useCallback(() => {
    setState({
      step: 1,
      selectedStudents: [],
      isProcessing: false,
      clientSecret: undefined,
      hasAgreedToTerms: false,
      isTermsModalOpen: false,
    })
  }, [])

  const value = {
    state,
    actions: {
      nextStep,
      previousStep,
      setStep,
      addStudent,
      removeStudent,
      setSelectedStudents,
      handleTermsAgreement,
      toggleTermsModal,
      handleEnrollment,
      resetForm,
    },
  }

  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  )
}

export function useEnrollment() {
  const context = useContext(EnrollmentContext)
  if (context === undefined) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider')
  }
  return context
}
