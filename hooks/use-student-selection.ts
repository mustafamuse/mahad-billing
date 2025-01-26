'use client'

import { useEffect, useState } from 'react'

import { UseFormReturn } from 'react-hook-form'

import { useEnrollment } from '@/contexts/enrollment-context'
import { type EnrollmentFormValues } from '@/lib/schemas/enrollment'
import { Student } from '@/lib/types'

interface UseStudentSelectionProps {
  form: UseFormReturn<EnrollmentFormValues>
}

export function useStudentSelection({ form }: UseStudentSelectionProps) {
  const [enrolledStudents, setEnrolledStudents] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const {
    state: { selectedStudents },
    actions: { setSelectedStudents },
  } = useEnrollment()

  const fetchEnrolledStudents = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setIsRetrying(true)

      const response = await fetch('/api/students/enrolled', {
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to fetch enrolled students')
      }

      const { enrolledStudents } = await response.json()
      setEnrolledStudents(new Set(enrolledStudents))
      setError(null)
    } catch (error) {
      console.error('Error fetching enrolled students:', error)
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to load enrolled students. Please try again.'
      )
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    fetchEnrolledStudents()
  }, [])

  // Update form value when selected students change
  useEffect(() => {
    form.setValue(
      'students',
      selectedStudents.map((s) => s.id),
      { shouldValidate: true }
    )
  }, [selectedStudents, form])

  const handleStudentSelect = (student: Student) => {
    if (!selectedStudents.find((s) => s.id === student.id)) {
      const newStudents = [...selectedStudents, student]
      setSelectedStudents(newStudents)
    }
  }

  const handleStudentRemove = (studentId: string) => {
    const newStudents = selectedStudents.filter((s) => s.id !== studentId)
    setSelectedStudents(newStudents)
  }

  const isStudentSelected = (studentId: string) =>
    selectedStudents.some((s) => s.id === studentId)

  const isStudentEnrolled = (studentId: string) =>
    enrolledStudents.has(studentId)

  return {
    selectedStudents,
    isLoading,
    error,
    isRetrying,
    fetchEnrolledStudents,
    handleStudentSelect,
    handleStudentRemove,
    isStudentSelected,
    isStudentEnrolled,
  }
}
