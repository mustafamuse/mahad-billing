'use client'

import { useState } from 'react'

import { Loader2, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'

import { ErrorBoundary } from '@/components/error-boundary'
import { Button } from '@/components/ui/button'
import type { RegisterStudent } from '@/lib/actions/register'

import { ConfirmDialog } from './confirm-dialog'
import { SiblingPromptDialog } from './sibling-prompt-dialog'
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
        Search for your name or create a new registration
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
  const { updateStudent, createStudent } = useStudentMutations()

  const [selectedStudent, setSelectedStudent] =
    useState<RegisterStudent | null>(null)
  const [isNewRegistration, setIsNewRegistration] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showNewRegConfirmDialog, setShowNewRegConfirmDialog] = useState(false)
  const [showSiblingPrompt, setShowSiblingPrompt] = useState(false)
  const [pendingStudent, setPendingStudent] = useState<RegisterStudent | null>(
    null
  )

  const handleStudentSelect = (student: RegisterStudent) => {
    setSelectedStudent(student)
    setIsNewRegistration(false)
  }

  const handleCreateNew = () => {
    setIsNewRegistration(true)
    setSelectedStudent(null)
  }

  const handleCancel = () => {
    if (updateStudent.isPending) return

    if (hasFormChanges) {
      setShowConfirmDialog(true)
    } else {
      setSelectedStudent(null)
    }
  }

  const handleCancelNewRegistration = () => {
    if (createStudent.isPending) return
    setShowNewRegConfirmDialog(true)
  }

  const handleRegistrationComplete = (newStudent: RegisterStudent) => {
    setPendingStudent(newStudent)
    setShowSiblingPrompt(true)
  }

  const handleSiblingPromptResponse = (hasSiblings: boolean) => {
    if (hasSiblings && pendingStudent) {
      setSelectedStudent(pendingStudent)
      setIsNewRegistration(false)
    } else {
      setSelectedStudent(null)
      setIsNewRegistration(false)
      toast.success('Registration completed successfully!')
    }
    setPendingStudent(null)
  }

  const handleStudentUpdate = (updatedStudent: RegisterStudent) => {
    // Only close the form if the student still exists
    if (updatedStudent) {
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

  if (isLoading) {
    return <RegisterFormSkeleton />
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-3xl space-y-8">
        {!isNewRegistration && (
          <StudentSearch
            students={students || []}
            selectedStudent={selectedStudent}
            onSelect={handleStudentSelect}
            emptyMessage={
              <div className="px-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No students found
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full gap-2"
                  onClick={handleCreateNew}
                >
                  <PlusCircle className="h-4 w-4" />
                  Create New Registration
                </Button>
              </div>
            }
          />
        )}

        {isNewRegistration ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                New Registration
              </h2>
              <Button
                variant="ghost"
                onClick={handleCancelNewRegistration}
                disabled={createStudent.isPending}
              >
                Back to Search
              </Button>
            </div>
            <StudentForm
              isNew={true}
              student={null}
              students={students || []}
              onStudentUpdate={handleRegistrationComplete}
            />
            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                form="student-form"
                disabled={createStudent.isPending}
              >
                {createStudent.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Registration...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </div>
          </div>
        ) : selectedStudent ? (
          <>
            <StudentForm
              student={selectedStudent}
              students={students || []}
              onStudentUpdate={handleStudentUpdate}
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

        <ConfirmDialog
          open={showNewRegConfirmDialog}
          onOpenChange={setShowNewRegConfirmDialog}
          onConfirm={() => {
            setIsNewRegistration(false)
            setSelectedStudent(null)
            setShowNewRegConfirmDialog(false)
          }}
          title="Cancel Registration"
          description={
            <>
              Are you sure you want to cancel your registration?
              <br />
              All entered information will be lost.
            </>
          }
        />

        <SiblingPromptDialog
          open={showSiblingPrompt}
          onOpenChange={setShowSiblingPrompt}
          onConfirm={handleSiblingPromptResponse}
        />
      </div>
    </ErrorBoundary>
  )
}
