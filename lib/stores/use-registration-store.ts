import { EducationLevel, GradeLevel } from '@prisma/client'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types
interface StudentFormData {
  email: string | null
  phone: string | null
  schoolName: string | null
  educationLevel: EducationLevel | null
  gradeLevel: GradeLevel | null
}

interface SiblingGroup {
  id: string
  students: {
    id: string
    name: string
  }[]
}

export interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  schoolName: string | null
  educationLevel: EducationLevel | null
  gradeLevel: GradeLevel | null
  siblingGroup: SiblingGroup | null
}

interface ValidationError {
  field: string
  message: string
}

interface RegistrationState {
  // Student Data
  selectedStudent: Student | null
  studentInfo: StudentFormData
  siblingGroup: SiblingGroup | null
  selectedSiblings: string[] // IDs of selected siblings for batch operations

  // UI State
  isLoading: boolean
  isSubmitting: boolean
  validationErrors: ValidationError[]

  // Form State
  isDirty: boolean
  hasUnsavedChanges: boolean

  // Dialogs
  dialogs: {
    confirmSave: boolean
    confirmRemoveSibling: boolean
    confirmDiscard: boolean
  }
}

interface RegistrationActions {
  // Student Selection
  setSelectedStudent: (student: Student | null) => void

  // Form Actions
  updateStudentInfo: (info: Partial<StudentFormData>) => void
  resetForm: () => void

  // Sibling Management
  toggleSiblingSelection: (siblingId: string) => void
  selectAllSiblings: () => void
  deselectAllSiblings: () => void
  addSibling: (siblingId: string) => Promise<void>
  removeSibling: (siblingId: string) => Promise<void>

  // Dialog Management
  openDialog: (dialog: keyof RegistrationState['dialogs']) => void
  closeDialog: (dialog: keyof RegistrationState['dialogs']) => void

  // Form State Management
  setIsDirty: (isDirty: boolean) => void
  setValidationErrors: (errors: ValidationError[]) => void

  // Save Actions
  saveChanges: () => Promise<void>
}

const initialState: RegistrationState = {
  selectedStudent: null,
  studentInfo: {
    email: null,
    phone: null,
    schoolName: null,
    educationLevel: null,
    gradeLevel: null,
  },
  siblingGroup: null,
  selectedSiblings: [],
  isLoading: false,
  isSubmitting: false,
  validationErrors: [],
  isDirty: false,
  hasUnsavedChanges: false,
  dialogs: {
    confirmSave: false,
    confirmRemoveSibling: false,
    confirmDiscard: false,
  },
}

export const useRegistrationStore = create<
  RegistrationState & RegistrationActions
>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Student Selection
      setSelectedStudent: (student) => {
        set({
          selectedStudent: student,
          studentInfo: student
            ? {
                email: student.email,
                phone: student.phone,
                schoolName: student.schoolName,
                educationLevel: student.educationLevel,
                gradeLevel: student.gradeLevel,
              }
            : initialState.studentInfo,
          siblingGroup: student?.siblingGroup ?? null,
          isDirty: false,
          hasUnsavedChanges: false,
          validationErrors: [],
        })
      },

      // Form Actions
      updateStudentInfo: (info) => {
        set((state) => ({
          studentInfo: { ...state.studentInfo, ...info },
          isDirty: true,
          hasUnsavedChanges: true,
        }))
      },

      resetForm: () => {
        set({ ...initialState })
      },

      // Sibling Management
      toggleSiblingSelection: (siblingId) => {
        set((state) => ({
          selectedSiblings: state.selectedSiblings.includes(siblingId)
            ? state.selectedSiblings.filter((id) => id !== siblingId)
            : [...state.selectedSiblings, siblingId],
        }))
      },

      selectAllSiblings: () => {
        const { siblingGroup } = get()
        if (!siblingGroup) return
        set({
          selectedSiblings: siblingGroup.students.map((s) => s.id),
        })
      },

      deselectAllSiblings: () => {
        set({ selectedSiblings: [] })
      },

      addSibling: async (siblingId) => {
        const { selectedStudent } = get()
        if (!selectedStudent) return

        set({ isLoading: true })
        try {
          const response = await fetch(
            `/api/register/students/${selectedStudent.id}/siblings`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ siblingId }),
            }
          )

          if (!response.ok) throw new Error('Failed to add sibling')

          const updatedStudent = await response.json()
          set((state) => ({
            selectedStudent: {
              ...state.selectedStudent!,
              siblingGroup: updatedStudent.siblingGroup,
            },
            siblingGroup: updatedStudent.siblingGroup,
          }))
        } catch (error) {
          console.error('Error adding sibling:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      removeSibling: async (siblingId) => {
        const { selectedStudent } = get()
        if (!selectedStudent) return

        set({ isLoading: true })
        try {
          const response = await fetch(
            `/api/register/students/${selectedStudent.id}/siblings/${siblingId}`,
            { method: 'DELETE' }
          )

          if (!response.ok) throw new Error('Failed to remove sibling')

          const updatedStudent = await response.json()
          set((state) => ({
            selectedStudent: {
              ...state.selectedStudent!,
              siblingGroup: updatedStudent.siblingGroup,
            },
            siblingGroup: updatedStudent.siblingGroup,
          }))
        } catch (error) {
          console.error('Error removing sibling:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // Dialog Management
      openDialog: (dialog) => {
        set((state) => ({
          dialogs: { ...state.dialogs, [dialog]: true },
        }))
      },

      closeDialog: (dialog) => {
        set((state) => ({
          dialogs: { ...state.dialogs, [dialog]: false },
        }))
      },

      // Form State Management
      setIsDirty: (isDirty) => {
        set({ isDirty })
      },

      setValidationErrors: (errors) => {
        set({ validationErrors: errors })
      },

      // Save Actions
      saveChanges: async () => {
        const { selectedStudent, studentInfo } = get()
        if (!selectedStudent) return

        set({ isSubmitting: true })
        try {
          const response = await fetch(
            `/api/register/students/${selectedStudent.id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(studentInfo),
            }
          )

          if (!response.ok) throw new Error('Failed to save changes')

          const updatedStudent = await response.json()
          set({
            selectedStudent: updatedStudent,
            studentInfo: {
              email: updatedStudent.email,
              phone: updatedStudent.phone,
              schoolName: updatedStudent.schoolName,
              educationLevel: updatedStudent.educationLevel,
              gradeLevel: updatedStudent.gradeLevel,
            },
            isDirty: false,
            hasUnsavedChanges: false,
          })
        } catch (error) {
          console.error('Error saving changes:', error)
        } finally {
          set({ isSubmitting: false })
        }
      },
    }),
    { name: 'registration-store' }
  )
)
