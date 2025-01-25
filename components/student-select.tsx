'use client'

import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BASE_RATE } from '@/lib/data'
import { Student } from '@/lib/types'

interface StudentSelectProps {
  students: Student[]
  selectedStudents: Student[]
  onStudentsChange: (students: Student[]) => void
}

export function StudentSelect({
  students,
  selectedStudents,
  onStudentsChange,
}: StudentSelectProps) {
  const handleStudentSelect = (studentId: string) => {
    const student = students.find((s: Student) => s.id === studentId)

    if (!student) return

    if (selectedStudents.some((s: Student) => s.id === student.id)) {
      return // Student already selected
    }

    onStudentsChange([...selectedStudents, student])
  }

  const handleStudentRemove = (studentId: string) => {
    onStudentsChange(
      selectedStudents.filter((s: Student) => s.id !== studentId)
    )
  }

  const renderStudentOption = (student: Student) => {
    const isSelected = selectedStudents.some(
      (s: Student) => s.id === student.id
    )
    return (
      <SelectItem
        key={student.id}
        value={student.id}
        disabled={isSelected}
        className="flex items-center justify-between"
      >
        <span>{student.name}</span>
        <span className="text-sm text-muted-foreground">
          ${student.customRate || BASE_RATE}/mo
        </span>
      </SelectItem>
    )
  }

  const renderSelectedStudent = (student: Student) => (
    <div
      key={student.id}
      className="flex items-center justify-between rounded-lg border p-4"
    >
      <div className="flex items-center gap-2">
        <Badge variant="secondary">${student.customRate || BASE_RATE}/mo</Badge>
        <span>{student.name}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleStudentRemove(student.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Select Students</h2>
        <Select onValueChange={handleStudentSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose students to enroll" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <ScrollArea className="h-[300px]">
                {students.map(renderStudentOption)}
              </ScrollArea>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {selectedStudents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">
              Selected Students ({selectedStudents.length})
            </h3>
          </div>
          <div className="space-y-3">
            {selectedStudents.map(renderSelectedStudent)}
          </div>
        </div>
      )}
    </div>
  )
}
