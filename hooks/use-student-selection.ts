'use client'

import { StudentDTO } from '@/lib/actions/get-students'

interface UseStudentSelectionProps {
  selectedStudents: StudentDTO[]
  updateSelectedStudents: (students: StudentDTO[]) => void
}

export function useStudentSelection({
  selectedStudents,
  updateSelectedStudents,
}: UseStudentSelectionProps) {
  const handleStudentSelect = (student: StudentDTO) => {
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
