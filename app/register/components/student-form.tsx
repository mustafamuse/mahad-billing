'use client'

import { useEffect, useState } from 'react'

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

  const [potentialDuplicate, setPotentialDuplicate] = useState<boolean>(false)
  const [potentialNameDuplicate, setPotentialNameDuplicate] =
    useState<boolean>(false)
  const [duplicateStudents, setDuplicateStudents] = useState<RegisterStudent[]>(
    []
  )

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

  // Check for potential duplicates when email or name changes
  useEffect(() => {
    const checkForDuplicates = async () => {
      const email = form.watch('email')
      const firstName = form.watch('firstName')
      const lastName = form.watch('lastName')

      if (!students) return

      // Reset states
      setPotentialDuplicate(false)
      setPotentialNameDuplicate(false)
      setDuplicateStudents([])

      // Check email duplicates
      if (email && email.length >= 5) {
        const matchingEmailStudents = students.filter(
          (s) =>
            s.email?.toLowerCase() === email.toLowerCase() &&
            s.id !== student?.id
        )

        if (matchingEmailStudents.length > 0) {
          setPotentialDuplicate(true)
          setDuplicateStudents((prev) => [...prev, ...matchingEmailStudents])
        }
      }

      // Check name duplicates
      if (
        firstName &&
        lastName &&
        firstName.length >= 2 &&
        lastName.length >= 2
      ) {
        const fullName = `${firstName} ${lastName}`.trim().toLowerCase()

        const matchingNameStudents = students.filter(
          (s) =>
            s.name.toLowerCase() === fullName &&
            s.id !== student?.id &&
            !duplicateStudents.some((ds) => ds.id === s.id)
        )

        if (matchingNameStudents.length > 0) {
          setPotentialNameDuplicate(true)
          setDuplicateStudents((prev) => [...prev, ...matchingNameStudents])
        }
      }
    }

    checkForDuplicates()
  }, [
    form.watch('email'),
    form.watch('firstName'),
    form.watch('lastName'),
    students,
    student?.id,
  ])

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
          {(potentialDuplicate || potentialNameDuplicate) &&
            duplicateStudents.length > 0 && (
              <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Potential Duplicate
                      {duplicateStudents.length > 1 ? 's' : ''}
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        {potentialDuplicate && potentialNameDuplicate
                          ? 'Students with this email and name already exist.'
                          : potentialDuplicate
                            ? 'A student with this email already exists.'
                            : 'A student with this name already exists.'}
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {duplicateStudents.map((s) => (
                          <li key={s.id}>
                            {s.name} {s.email ? `(${s.email})` : ''}
                            {s.batch ? ` - Batch: ${s.batch.name}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
