'use client'

import { useState, useEffect } from 'react'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, RefreshCcw, Loader2 } from 'lucide-react'

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
import { useEnrollment } from '@/contexts/enrollment-context'
import { useStudentSelection } from '@/hooks/use-student-selection'
import { type Student } from '@/lib/types'

import { StepsProgress } from './steps-progress'

interface StudentSelectionStepProps {
  students: Student[]
}

export function StudentSelectionStep({ students }: StudentSelectionStepProps) {
  const [open, setOpen] = useState(false)
  const {
    state: { selectedStudents, isProcessing },
    actions: { nextStep, updateSelectedStudents },
  } = useEnrollment()

  const {
    isLoading,
    error,
    isRetrying,
    fetchEnrolledStudents,
    handleStudentSelect,
    handleStudentRemove,
    isStudentEnrolled,
    isStudentSelected,
  } = useStudentSelection({ selectedStudents, updateSelectedStudents })

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit clicked in StudentSelectionStep', {
      selectedStudents,
      selectedStudentsLength: selectedStudents.length,
      isProcessing,
    })
    if (selectedStudents.length > 0) {
      console.log('Calling nextStep from StudentSelectionStep')
      nextStep()
    }
  }

  return (
    <div>
      <StepsProgress currentStep={1} />
      <Card className="border-0 sm:border">
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl">
            Select Your Name
          </CardTitle>
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

          <div className="space-y-4">
            <StudentSearchCombobox
              students={students}
              isLoading={isLoading}
              error={error}
              open={open}
              onOpenChange={setOpen}
              onSelect={handleStudentSelect}
              isStudentSelected={isStudentSelected}
              isStudentEnrolled={isStudentEnrolled}
            />

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
        </CardContent>
        <CardFooter className="p-4 sm:p-6">
          <Button
            type="button"
            className="h-12 w-full text-base font-medium"
            disabled={selectedStudents.length === 0 || isProcessing}
            aria-label="Continue to payment details"
            onClick={onSubmit}
          >
            {isProcessing ? (
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
    </div>
  )
}
