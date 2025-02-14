'use client'

import { useState } from 'react'

import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  RegisterStudent,
  updateRegistrationStudent,
} from '@/lib/actions/register'

import { ConfirmDialog } from './confirm-dialog'
import { StudentFormValues, studentFormSchema } from '../schema'
import { StudentForm } from './student-form'
import { StudentSearch } from './student-search'

interface RegisterFormProps {
  students: RegisterStudent[]
  onStudentsUpdate?: (students: RegisterStudent[]) => void
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <h3 className="text-lg font-medium">No Student Selected</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Please search and select your name to update your information
      </p>
    </div>
  )
}

export function RegisterForm({
  students,
  onStudentsUpdate,
}: RegisterFormProps) {
  const [selectedStudent, setSelectedStudent] =
    useState<RegisterStudent | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [formValues, setFormValues] = useState<StudentFormValues | null>(null)
  const [formStatus, setFormStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleStudentSelect = (student: RegisterStudent) => {
    setSelectedStudent(student)
    setHasChanges(false)
  }

  const handleFormUpdate = async (values: StudentFormValues) => {
    if (!selectedStudent) return
    setHasChanges(true)
    setFormValues(values)
  }

  const handleSubmit = async () => {
    if (!selectedStudent || !formValues) return

    try {
      setFormStatus('submitting')

      // Add this console.log to check form values
      console.log('Form Values:', formValues)

      await studentFormSchema.parseAsync(formValues)

      const { student } = await updateRegistrationStudent(selectedStudent.id, {
        name: `${formValues.firstName} ${formValues.lastName}`.trim(),
        email: formValues.email,
        phone: formValues.phone,
        dateOfBirth: formValues.dateOfBirth,
        educationLevel: formValues.educationLevel,
        gradeLevel: formValues.gradeLevel, // Make sure this is being sent
        schoolName: formValues.schoolName,
      })

      // Add this to verify the response
      console.log('Updated Student:', student)

      setFormStatus('success')
      toast.success('Changes saved successfully')
      setHasChanges(false)

      // Update local state with new data
      if (onStudentsUpdate) {
        const updatedStudents = students.map((s) =>
          s.id === student.id ? student : s
        )
        onStudentsUpdate(updatedStudents)
      }

      setSelectedStudent(student)
    } catch (err) {
      setFormStatus('error')
      handleFormError(err)
    } finally {
      setFormStatus('idle')
    }
  }

  // Handle cancel with unsaved changes
  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmDialog(true)
    } else {
      setSelectedStudent(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <StudentSearch
        students={students}
        selectedStudent={selectedStudent}
        onSelect={handleStudentSelect}
      />

      {selectedStudent ? (
        <>
          <StudentForm
            student={selectedStudent}
            students={students}
            onUpdate={handleFormUpdate}
            onStudentUpdate={setSelectedStudent}
          />
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={formStatus === 'submitting'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={formStatus === 'submitting' || !hasChanges}
              className="min-w-[120px]"
            >
              {formStatus === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </>
      ) : (
        <EmptyState />
      )}

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={() => {
          setSelectedStudent(null)
          setShowConfirmDialog(false)
        }}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to leave?"
      />
    </div>
  )
}

export function handleFormError(err: unknown) {
  if (err instanceof z.ZodError) {
    const errors = err.errors.map((e) => e.message)
    toast.error(
      <div className="space-y-2">
        <p className="font-medium">Please fix the following:</p>
        <ul className="list-disc pl-4 text-sm">
          {errors.map((error, i) => (
            <li key={i}>{error}</li>
          ))}
        </ul>
      </div>
    )
    return
  }

  toast.error(
    err instanceof Error ? err.message : 'An unexpected error occurred'
  )
}
