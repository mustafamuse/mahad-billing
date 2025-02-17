'use client'

import { useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { ErrorBoundary } from '@/components/error-boundary'
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
import { StudentWithSiblings } from '../types'
import { getFormInitialValues } from '../utils'

interface StudentFormProps {
  student: RegisterStudent | null | undefined
  students: RegisterStudent[]
  onStudentUpdate: (student: RegisterStudent) => void
  isNew?: boolean
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
  isNew = false,
}: StudentFormProps) {
  const {
    data: studentData,
    isLoading,
    error,
  } = useStudent(student?.id ?? '', student as StudentWithSiblings | undefined)

  const { updateStudent, createStudent } = useStudentMutations()

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: isNew ? {} : getFormInitialValues(student),
    mode: 'onChange',
  })

  const { control, handleSubmit, reset } = form

  useEffect(() => {
    if (!isNew && studentData) {
      form.reset(getFormInitialValues(studentData))
    }
  }, [studentData, form, isNew])

  const onSubmit = async (values: StudentFormValues) => {
    try {
      if (isNew) {
        const result = await createStudent.mutateAsync(values)
        if (result.success && result.student) {
          reset(values)
          onStudentUpdate(result.student)
        }
      } else {
        const result = await updateStudent.mutateAsync({
          id: student?.id ?? '',
          values,
        })
        if (result.success && result.student) {
          reset(values)
          onStudentUpdate(result.student)
        }
      }
    } catch (error) {
      console.error('Form submission failed:', error)
    }
  }

  if (!isNew) {
    if (isLoading) return <LoadingSkeleton />
    if (error) throw error
    if (!studentData) return null
  }

  return (
    <ErrorBoundary>
      <Form {...form}>
        <form
          id="student-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <div className="space-y-4">
            <PersonalSection control={control} />
            <ContactSection control={control} />
            <EducationSection control={control} />
            {!isNew && studentData && (
              <SiblingSection
                student={{
                  ...studentData,
                  id: studentData?.id ?? '',
                  name: studentData?.name ?? '',
                  email: studentData?.email ?? null,
                  phone: studentData?.phone ?? null,
                  dateOfBirth: studentData?.dateOfBirth ?? null,
                  educationLevel: studentData?.educationLevel ?? null,
                  gradeLevel: studentData?.gradeLevel ?? null,
                  schoolName: studentData?.schoolName ?? null,
                  siblingGroup: studentData?.siblingGroup ?? null,
                }}
                students={students}
                onStudentUpdate={onStudentUpdate}
              />
            )}
          </div>
        </form>
      </Form>
    </ErrorBoundary>
  )
}
