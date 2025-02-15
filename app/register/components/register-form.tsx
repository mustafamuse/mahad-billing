'use client'

import { useState } from 'react'

import { Loader2 } from 'lucide-react'

import { ErrorBoundary } from '@/components/error-boundary'
import { Button } from '@/components/ui/button'
import type { RegisterStudent } from '@/lib/actions/register'

import { ConfirmDialog } from './confirm-dialog'
import { StudentForm } from './student-form'
import { StudentSearch } from './student-search'
import { useStudentMutations } from '../hooks/use-student-mutations'
import { useStudents } from '../hooks/use-students'

interface RegisterFormProps {
  initialStudents: RegisterStudent[]
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

function RegisterFormSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="h-12 animate-pulse rounded bg-muted" />
      <div className="h-[400px] animate-pulse rounded-lg border bg-card" />
    </div>
  )
}

export function RegisterForm({ initialStudents }: RegisterFormProps) {
  const { data: students, isLoading } = useStudents(initialStudents)
  const { updateStudent } = useStudentMutations()

  const [selectedStudent, setSelectedStudent] =
    useState<RegisterStudent | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  if (isLoading) {
    return <RegisterFormSkeleton />
  }

  const handleStudentSelect = (student: RegisterStudent) => {
    setSelectedStudent(student)
  }

  const handleCancel = () => {
    if (updateStudent.isPending) return

    if (hasFormChanges) {
      setShowConfirmDialog(true)
    } else {
      setSelectedStudent(null)
    }
  }

  // Compute if form has changes
  const hasFormChanges =
    selectedStudent &&
    (selectedStudent.name.split(' ')[0] !==
      selectedStudent.name.split(' ')[0] ||
      selectedStudent.name.split(' ').slice(1).join(' ') !==
        selectedStudent.name.split(' ').slice(1).join(' ') ||
      selectedStudent.email !== selectedStudent.email ||
      selectedStudent.phone !== selectedStudent.phone ||
      selectedStudent.schoolName !== selectedStudent.schoolName ||
      selectedStudent.educationLevel !== selectedStudent.educationLevel ||
      selectedStudent.gradeLevel !== selectedStudent.gradeLevel ||
      selectedStudent.dateOfBirth?.toISOString() !==
        selectedStudent.dateOfBirth?.toISOString())

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-3xl space-y-8">
        <StudentSearch
          students={students || []}
          selectedStudent={selectedStudent}
          onSelect={handleStudentSelect}
          emptyMessage={
            <div className="px-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">No students found</p>
            </div>
          }
        />

        {selectedStudent ? (
          <>
            <StudentForm
              student={selectedStudent}
              students={students || []}
              onStudentUpdate={setSelectedStudent}
            />
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateStudent.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="student-form"
                disabled={updateStudent.isPending}
              >
                {updateStudent.isPending ? (
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
    </ErrorBoundary>
  )
}
