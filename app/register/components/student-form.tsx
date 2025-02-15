'use client'

import { useEffect, useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { ErrorBoundary } from '@/components/error-boundary'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { RegisterStudent } from '@/lib/actions/register'

import {
  ContactSection,
  PersonalSection,
  EducationSection,
  SiblingSection,
} from '../fields'
import { useStudentMutations } from '../hooks/use-student-mutations'
import { useStudent } from '../hooks/use-students'
import { studentFormSchema, StudentFormValues } from '../schema'
import { getFormInitialValues } from '../utils'
import { ConfirmDialog } from './confirm-dialog'

interface StudentFormProps {
  student: RegisterStudent
  students: RegisterStudent[]
  onStudentUpdate: (student: RegisterStudent) => void
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
      </div>
      {/* Add more skeleton items */}
    </div>
  )
}

export function StudentForm({
  student,
  students,
  onStudentUpdate,
}: StudentFormProps) {
  const {
    data: studentData,
    isLoading,
    error,
  } = useStudent(student.id, student)
  console.log('Initial student:', student)
  console.log('Student data:', studentData)
  const { updateStudent } = useStudentMutations()
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: getFormInitialValues(student),
    mode: 'onChange',
  })

  const {
    formState: { isSubmitting, isDirty },
    control,
    handleSubmit,
    reset,
  } = form

  useEffect(() => {
    if (studentData) {
      form.reset(getFormInitialValues(studentData))
    }
  }, [studentData, form])

  const onSubmit = async (values: StudentFormValues) => {
    try {
      const result = await updateStudent.mutateAsync({
        id: student.id,
        values,
      })
      if (result.success && result.student) {
        reset(values)
        onStudentUpdate(result.student)
      }
    } catch (error) {
      console.error('Form submission failed:', error)
    }
  }

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      form.reset()
    }
  }

  if (isLoading) return <LoadingSkeleton />
  if (error) throw error
  if (!studentData) return null

  return (
    <ErrorBoundary>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <PersonalSection control={control} />
            <ContactSection control={control} />
            <EducationSection control={control} />
            <SiblingSection
              control={control}
              student={studentData}
              students={students}
              onStudentUpdate={onStudentUpdate}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateStudent.isPending || isSubmitting}
            >
              {updateStudent.isPending || isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        title="Discard Changes"
        description="Are you sure you want to discard your changes?"
        onConfirm={() => {
          form.reset()
          setShowDiscardDialog(false)
        }}
      />
    </ErrorBoundary>
  )
}
