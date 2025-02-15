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
import { getFormInitialValues } from '../utils'

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

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: getFormInitialValues(student),
    mode: 'onChange',
  })

  const { control, handleSubmit, reset } = form

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

  if (isLoading) return <LoadingSkeleton />
  if (error) throw error
  if (!studentData) return null

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
            <SiblingSection
              control={control}
              student={studentData}
              students={students}
              onStudentUpdate={onStudentUpdate}
            />
          </div>
        </form>
      </Form>
    </ErrorBoundary>
  )
}
