'use client'

import { useState } from 'react'

import { AlertCircle, RefreshCcw } from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'

import { StudentCard } from '@/components/enrollment/student-card'
import { StudentSearchCombobox } from '@/components/enrollment/student-search-combobox'
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
import { calculateTotal } from '@/lib/utils'

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

  return (
    <Card className="border-0 sm:border">
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">Select Your Name</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Choose the students you want to enroll in the mahad autopay system
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
                    {selectedStudents.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        onRemove={handleStudentRemove}
                      />
                    ))}
                  </div>

                  {selectedStudents.length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total Students Selected
                        </span>
                        <span className="font-medium">
                          {selectedStudents.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium sm:text-base">
                          Your Monthly Tuition Total
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-bold sm:text-xl">
                            ${calculateTotal(selectedStudents)}
                          </span>
                          <span className="block text-xs text-muted-foreground sm:text-sm">
                            per month
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
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
          disabled={selectedStudents.length === 0}
          aria-label="Continue to payment details"
        >
          Continue to Payment Details
        </Button>
      </CardFooter>
    </Card>
  )
}
