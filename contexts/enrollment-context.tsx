'use client'

import { createContext, useContext, useState, useCallback } from 'react'

import { UseFormReturn } from 'react-hook-form'

import { toasts } from '@/components/toast/toast-utils'
import { type EnrollmentFormValues } from '@/lib/schemas/enrollment'
import { Student } from '@/lib/types'

interface EnrollmentState {
  step: number
  selectedStudents: Student[]
  isProcessing: boolean
  clientSecret?: string
  hasViewedTerms: boolean
  isTermsModalOpen: boolean
}

interface EnrollmentActions {
  nextStep: () => void
  previousStep: () => void
  setStep: (step: number) => void
  addStudent: (student: Student) => void
  removeStudent: (studentId: string) => void
  setSelectedStudents: (students: Student[]) => void
  handleTermsAgreement: (form: UseFormReturn<EnrollmentFormValues>) => void
  toggleTermsModal: () => void
  handleEnrollment: (values: EnrollmentFormValues) => Promise<void>
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
    hasViewedTerms: false,
    isTermsModalOpen: false,
  })

  // Actions
  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.step === 1) {
        console.log('Moving to Payor Details Step:', {
          selectedStudents: prev.selectedStudents.map((s) => ({
            id: s.id,
            name: s.name,
            monthlyRate: s.monthlyRate,
          })),
          totalStudents: prev.selectedStudents.length,
          totalMonthlyRate: prev.selectedStudents.reduce(
            (sum, s) => sum + s.monthlyRate,
            0
          ),
        })
      }
      return { ...prev, step: prev.step + 1 }
    })
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

  const handleTermsAgreement = useCallback(
    (form: UseFormReturn<EnrollmentFormValues>) => {
      setState((prev) => ({
        ...prev,
        hasViewedTerms: true,
        isTermsModalOpen: false,
      }))
      form.setValue('termsAccepted', true)
    },
    []
  )

  const toggleTermsModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTermsModalOpen: !prev.isTermsModalOpen,
    }))
  }, [])

  const handleEnrollment = useCallback(
    async (values: EnrollmentFormValues) => {
      try {
        console.log('Starting enrollment process...', {
          values,
          currentStep: state.step,
        })
        setState((prev) => ({ ...prev, isProcessing: true }))

        console.log('Submitting Enrollment:', {
          payorDetails: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            relationship: values.relationship,
          },
          students: {
            list: state.selectedStudents.map((s) => ({
              id: s.id,
              name: s.name,
              monthlyRate: s.monthlyRate,
            })),
            count: state.selectedStudents.length,
            totalMonthlyRate: state.selectedStudents.reduce(
              (sum, s) => sum + s.monthlyRate,
              0
            ),
          },
          termsAccepted: values.termsAccepted,
        })

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

        console.log('Making API request to /api/enroll:', requestBody)

        const response = await fetch('/api/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          })
          throw new Error(errorText || 'Failed to create SetupIntent')
        }

        const { clientSecret } = await response.json()
        console.log('Successfully created SetupIntent, moving to step 3')

        setState((prev) => ({
          ...prev,
          clientSecret,
          step: 3,
        }))
      } catch (error) {
        console.error('Detailed enrollment error:', error)
        toasts.apiError({ error })
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
      hasViewedTerms: false,
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
