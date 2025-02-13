'use client'

import { useState } from 'react'

import { X } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Student } from '@/lib/stores/use-registration-store'

interface SiblingManagementProps {
  student: Student
  students: Student[]
  onSiblingAdd: (siblingId: string) => Promise<void>
  onSiblingRemove: (siblingId: string) => Promise<void>
  isStudentInfoValid: boolean
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>

  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-900">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  )
}

export function SiblingManagement({
  student,
  students,
  onSiblingAdd,
  onSiblingRemove,
  isStudentInfoValid,
}: SiblingManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false)
  const [siblingToRemove, setSiblingToRemove] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filter out current student and existing siblings
  const filteredStudents = students.filter((s: Student) => {
    const isCurrentStudent = s.id === student.id
    const isAlreadySibling = student.siblingGroup?.students.some(
      (sibling: { id: string }) => sibling.id === s.id
    )
    const matchesSearch = s.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    return !isCurrentStudent && !isAlreadySibling && matchesSearch
  })

  const handleSelect = (selectedStudent: Student) => {
    setSelectedStudent(selectedStudent)
  }

  const handleConfirmAdd = async () => {
    if (!selectedStudent) return
    if (!isStudentInfoValid) {
      toast.error('Please fill in all required student information first')
      return
    }

    setIsLoading(true)
    try {
      await onSiblingAdd(selectedStudent.id)
      setSelectedStudent(null)
      setSearchQuery('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (siblingId: string) => {
    setSiblingToRemove(siblingId)
    setIsConfirmRemoveOpen(true)
  }

  const getRemovalMessage = () => {
    if (!siblingToRemove || !student.siblingGroup) return ''
    const sibling = student.siblingGroup.students.find(
      (s) => s.id === siblingToRemove
    )
    return `Are you sure you want to remove ${sibling?.name} as a sibling?`
  }

  const handleConfirmRemove = async () => {
    if (!siblingToRemove) return

    setIsLoading(true)
    try {
      await onSiblingRemove(siblingToRemove)
      setIsConfirmRemoveOpen(false)
      setSiblingToRemove(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sibling Management</CardTitle>
        <CardDescription>
          Add or remove siblings to manage family connections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Siblings */}
        {student.siblingGroup && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Siblings</h3>
            <div className="space-y-2">
              {student.siblingGroup.students
                .filter((s) => s.id !== student.id)
                .map((sibling) => (
                  <div
                    key={sibling.id}
                    className="flex items-center justify-between rounded-lg border p-2"
                  >
                    <span className="text-sm">{sibling.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(sibling.id)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Add Sibling */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Add Sibling</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleConfirmAdd}
              disabled={!selectedStudent || isLoading || !isStudentInfoValid}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </div>

          {/* Search Results */}
          {searchQuery && filteredStudents.length > 0 && (
            <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-lg border p-2">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleSelect(student)}
                  className={`w-full rounded-lg p-2 text-left text-sm hover:bg-accent ${selectedStudent?.id === student.id ? 'bg-accent' : ''}`}
                >
                  <HighlightedText text={student.name} query={searchQuery} />
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Remove Sibling Confirmation */}
      <AlertDialog
        open={isConfirmRemoveOpen}
        onOpenChange={setIsConfirmRemoveOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Sibling</AlertDialogTitle>
            <AlertDialogDescription>
              {getRemovalMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
