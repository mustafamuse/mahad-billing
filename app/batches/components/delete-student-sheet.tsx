'use client'

import { useState, useEffect } from 'react'

import { Trash2, AlertCircle, UserX } from 'lucide-react'
import { toast } from 'sonner'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getStudentDetails,
  getStudentWarnings,
  deleteStudent,
} from '@/lib/actions/student-actions'
import { getBatchStyle } from '@/lib/config/batch-styles'
import type { StudentDetails, DeleteWarnings } from '@/lib/types/student'

function StudentSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  )
}

export function DeleteStudentSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)
  const [isLoading, setIsLoading] = useState(false)
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteWarnings, setDeleteWarnings] = useState<DeleteWarnings | null>(
    null
  )

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setStudentDetails(null)
      setError(null)
      setDeleteWarnings(null)
    }
  }, [isOpen])

  // Increase debounce delay and add minimum search length
  useEffect(() => {
    if (searchTerm.length < 3) {
      setStudentDetails(null)
      setError(null)
      return
    }

    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500) // Increased to 500ms
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (!debouncedTerm.trim() || debouncedTerm.length < 3) {
      setStudentDetails(null)
      setError(null)
      return
    }

    const search = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const details = await getStudentDetails(debouncedTerm)
        setStudentDetails(details)
      } catch (err) {
        console.error('Search error:', err)
        setError(err instanceof Error ? err.message : 'Student not found')
        setStudentDetails(null)
      } finally {
        setIsLoading(false)
      }
    }

    search()
  }, [debouncedTerm])

  const handleDelete = async () => {
    if (!studentDetails) return

    setIsDeleting(true)
    try {
      await deleteStudent(studentDetails.student.id)
      toast.success('Student deleted successfully')
      setStudentDetails(null)
      setDeleteWarnings(null)
      setIsOpen(false)
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete student')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="destructive" size="sm">
          <UserX className="mr-2 h-4 w-4" />
          Delete Student
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Delete Student</SheetTitle>
          <SheetDescription>
            Search for a student by name, email, or phone number to delete them
            from the system.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Type at least 3 characters to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="w-full"
              autoFocus
            />
          </div>

          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Please enter at least 3 characters to search
            </p>
          )}

          <ScrollArea className="mt-6 h-[60vh]">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/10">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {isLoading && <StudentSkeleton />}

            {studentDetails && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {studentDetails.student.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {studentDetails.student.email || 'No email'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {studentDetails.student.phone || 'No phone'}
                      </p>
                    </div>
                    <Badge
                      variant={
                        studentDetails.student.status === 'enrolled'
                          ? 'default'
                          : studentDetails.student.status === 'registered'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {studentDetails.student.status}
                    </Badge>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  {/* Batch Information */}
                  <AccordionItem value="batch" className="border-b-0">
                    <AccordionTrigger>Batch Assignment</AccordionTrigger>
                    <AccordionContent>
                      {studentDetails.associations.batch ? (
                        <div className="space-y-2">
                          <Badge
                            variant={
                              getBatchStyle(
                                studentDetails.associations.batch.name
                              ).variant
                            }
                            className={
                              getBatchStyle(
                                studentDetails.associations.batch.name
                              ).className
                            }
                          >
                            {studentDetails.associations.batch.name}
                          </Badge>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No batch assigned
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Payer Information */}
                  <AccordionItem value="payer">
                    <AccordionTrigger>Payer Details</AccordionTrigger>
                    <AccordionContent>
                      {studentDetails.associations.payer ? (
                        <div className="space-y-2">
                          <p className="font-medium">
                            {studentDetails.associations.payer.name}
                          </p>
                          <p className="text-sm">
                            {studentDetails.associations.payer.email}
                          </p>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <p>
                              Active Subscriptions:{' '}
                              {
                                studentDetails.associations.payer
                                  .activeSubscriptions
                              }
                            </p>
                            <p>
                              Total Students:{' '}
                              {studentDetails.associations.payer.totalStudents}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No payer assigned
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Sibling Information */}
                  <AccordionItem value="siblings">
                    <AccordionTrigger>Sibling Group</AccordionTrigger>
                    <AccordionContent>
                      {studentDetails.associations.siblingGroup ? (
                        <div className="space-y-2">
                          {studentDetails.associations.siblingGroup.students
                            .filter((s) => s.id !== studentDetails.student.id)
                            .map((sibling) => (
                              <div
                                key={sibling.id}
                                className="flex items-center gap-2"
                              >
                                <Badge variant="outline">{sibling.name}</Badge>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No siblings
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </ScrollArea>

          <SheetFooter className="mt-6">
            {studentDetails && (
              <Button
                variant="destructive"
                className="w-full"
                disabled={isDeleting}
                onClick={async () => {
                  const warnings = await getStudentWarnings(
                    studentDetails.student.id
                  )
                  setDeleteWarnings(warnings)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete This Student
              </Button>
            )}
          </SheetFooter>
        </div>

        <AlertDialog
          open={!!deleteWarnings}
          onOpenChange={() => setDeleteWarnings(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Student</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                Are you sure you want to delete {studentDetails?.student.name}?
                {deleteWarnings?.hasSiblings && (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    ⚠️ This student has siblings in the system
                  </p>
                )}
                {deleteWarnings?.isOnlyStudentForPayer && (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    ⚠️ This is the only student for this payer
                  </p>
                )}
                {deleteWarnings?.hasActiveSubscription && (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    ⚠️ This student's payer has active subscriptions
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
