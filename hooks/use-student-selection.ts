'use client'

import { type Student } from '@/lib/types'

interface UseStudentSelectionProps {
  selectedStudents: Student[]
  updateSelectedStudents: (students: Student[]) => void
}

export function useStudentSelection({
  selectedStudents,
  updateSelectedStudents,
}: UseStudentSelectionProps) {
  const handleStudentSelect = (student: Student) => {
    if (!selectedStudents.find((s) => s.id === student.id)) {
      const newStudents = [...selectedStudents, student]
      updateSelectedStudents(newStudents)
    }
  }

  const handleStudentRemove = (studentId: string) => {
    const newStudents = selectedStudents.filter((s) => s.id !== studentId)
    updateSelectedStudents(newStudents)
  }

  const isStudentSelected = (studentId: string) =>
    selectedStudents.some((s) => s.id === studentId)

  return {
    handleStudentSelect,
    handleStudentRemove,
    isStudentSelected,
  }
}
