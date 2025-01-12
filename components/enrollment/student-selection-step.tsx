'use client'

import { useState, useEffect } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, RefreshCcw, Loader2 } from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'

import { EmptySelection } from '@/components/enrollment/empty-selection'
import { EnrollmentSummary } from '@/components/enrollment/enrollment-summary'
import { StudentCard } from '@/components/enrollment/student-card'
import { StudentSearchCombobox } from '@/components/enrollment/student-search-combobox'
import { StudentListSkeleton } from '@/components/enrollment/student-skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { useStudentSelection } from '@/hooks/use-student-selection'
import { STUDENTS } from '@/lib/data'

interface StudentSelectionStepProps {
  form: UseFormReturn<FormValues>
}

interface FormValues {
  students: string[]
  firstName: string
  lastName: string
  email: string
  phone: string
  termsAccepted: boolean
}

export function StudentSelectionStep({ form }: StudentSelectionStepProps) {
  const [open, setOpen] = useState(false)
  const {
    selectedStudents,
    isLoading,
    error,
    isRetrying,
    fetchEnrolledStudents,
    handleStudentSelect,
    handleStudentRemove,
    isStudentEnrolled,
    isStudentSelected,
  } = useStudentSelection({ form })

  const isSubmitting = form.formState.isSubmitting

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open search with CMD/CTRL + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      // Close search with ESC
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [open])

  return (
    <Card className="border-0 sm:border">
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">Select Your Name</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Choose the students you want to enroll in the mahad autopay system.
          Press{' '}
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>{' '}
          to search.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEnrolledStudents}
                disabled={isRetrying}
                className="ml-2 h-8"
              >
                {isRetrying ? (
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="students"
          render={() => (
            <FormItem>
              <FormControl>
                <div className="space-y-4">
                  <StudentSearchCombobox
                    students={STUDENTS}
                    isLoading={isLoading}
                    error={error}
                    open={open}
                    onOpenChange={setOpen}
                    onSelect={handleStudentSelect}
                    isStudentSelected={isStudentSelected}
                    isStudentEnrolled={isStudentEnrolled}
                  />

                  <FormMessage />

                  <div
                    className="space-y-3"
                    role="list"
                    aria-label="Selected students"
                  >
                    {isLoading ? (
                      <StudentListSkeleton />
                    ) : selectedStudents.length === 0 ? (
                      <EmptySelection />
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {selectedStudents.map((student) => (
                          <motion.div
                            key={student.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                            }}
                          >
                            <StudentCard
                              student={student}
                              onRemove={handleStudentRemove}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>

                  <EnrollmentSummary selectedStudents={selectedStudents} />
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className="p-4 sm:p-6">
        <Button
          type="submit"
          className="h-12 w-full text-base font-medium"
          disabled={selectedStudents.length === 0 || isSubmitting}
          aria-label="Continue to payment details"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Continue to Payment Details'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
