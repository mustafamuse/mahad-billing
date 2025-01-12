'use client'

import { createContext, useContext, useReducer } from 'react'

import { Student } from '@/lib/types'

interface EnrollmentState {
  selectedStudents: Student[]
  currentStep: number
  termsAccepted: boolean
}

interface EnrollmentActions {
  setSelectedStudents: (students: Student[]) => void
  setCurrentStep: (step: number) => void
  setTermsAccepted: (accepted: boolean) => void
}

interface EnrollmentContextValue {
  state: EnrollmentState
  actions: EnrollmentActions
}

const EnrollmentContext = createContext<EnrollmentContextValue | undefined>(
  undefined
)

const initialState: EnrollmentState = {
  selectedStudents: [],
  currentStep: 0,
  termsAccepted: false,
}

type Action =
  | { type: 'SET_SELECTED_STUDENTS'; payload: Student[] }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_TERMS_ACCEPTED'; payload: boolean }

function reducer(state: EnrollmentState, action: Action): EnrollmentState {
  switch (action.type) {
    case 'SET_SELECTED_STUDENTS':
      return { ...state, selectedStudents: action.payload }
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload }
    case 'SET_TERMS_ACCEPTED':
      return { ...state, termsAccepted: action.payload }
    default:
      return state
  }
}

export function EnrollmentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions: EnrollmentActions = {
    setSelectedStudents: (students) =>
      dispatch({ type: 'SET_SELECTED_STUDENTS', payload: students }),
    setCurrentStep: (step) =>
      dispatch({ type: 'SET_CURRENT_STEP', payload: step }),
    setTermsAccepted: (accepted) =>
      dispatch({ type: 'SET_TERMS_ACCEPTED', payload: accepted }),
  }

  return (
    <EnrollmentContext.Provider value={{ state, actions }}>
      {children}
    </EnrollmentContext.Provider>
  )
}

export function useEnrollment() {
  const context = useContext(EnrollmentContext)
  if (!context) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider')
  }
  return context
}
