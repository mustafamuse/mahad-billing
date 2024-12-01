'use client'

import * as React from 'react'

import { Check, ChevronsUpDown, Search, X, AlertCircle } from 'lucide-react'
import { UseFormReturn } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { STUDENTS } from '@/lib/data'
import { Student } from '@/lib/types'
import { calculateTotal, calculateStudentPrice, cn } from '@/lib/utils'

interface StudentSelectionStepProps {
  selectedStudents: Student[]
  setSelectedStudents: React.Dispatch<React.SetStateAction<Student[]>>
  form: UseFormReturn<FormValues>
  onSubmit: (values: FormValues) => void
}

interface FormValues {
  students: string[]
  firstName: string
  lastName: string
  email: string
  phone: string
  termsAccepted: boolean
}

export function StudentSelectionStep({
  selectedStudents,
  setSelectedStudents,
  form,
  onSubmit,
}: StudentSelectionStepProps) {
  const [open, setOpen] = React.useState(false)
  const [enrolledStudents, setEnrolledStudents] = React.useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch enrolled students
  React.useEffect(() => {
    async function fetchEnrolledStudents() {
      try {
        const response = await fetch('/api/students/enrolled')
        if (!response.ok) throw new Error('Failed to fetch enrolled students')
        const { enrolledStudents } = await response.json()
        setEnrolledStudents(new Set(enrolledStudents))
      } catch (error) {
        console.error('Error fetching enrolled students:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEnrolledStudents()
  }, [])

  const handleStudentSelect = (student: Student) => {
    if (!selectedStudents.find((s) => s.id === student.id)) {
      const newStudents = [...selectedStudents, student]
      setSelectedStudents(newStudents)
      form.setValue(
        'students',
        newStudents.map((s) => s.id),
        {
          shouldValidate: true,
        }
      )
    }
    setOpen(false)
  }

  const handleStudentRemove = (studentId: string) => {
    const newStudents = selectedStudents.filter((s) => s.id !== studentId)
    setSelectedStudents(newStudents)
    form.setValue(
      'students',
      newStudents.map((s) => s.id),
      {
        shouldValidate: true,
      }
    )
  }

  const renderStudentItem = (student: Student) => {
    const isSelected = selectedStudents.some((s) => s.id === student.id)
    const isEnrolled = enrolledStudents.has(student.id)

    return (
      <CommandItem
        key={student.id}
        onSelect={() => !isEnrolled && handleStudentSelect(student)}
        className={cn(
          'px-2 py-3 text-base sm:py-2 sm:text-sm',
          isEnrolled && 'cursor-not-allowed opacity-50'
        )}
        disabled={isEnrolled}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Check
              className={cn(
                'h-4 w-4 shrink-0',
                isSelected ? 'opacity-100' : 'opacity-0'
              )}
            />
            <span className="truncate">{student.name}</span>
          </div>

          {isEnrolled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs">Already Enrolled</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This student is already enrolled in the program</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CommandItem>
    )
  }

  return (
    <Card className="border-0 sm:border">
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl">Select Your Name</CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Choose the students you want to enroll in the mahad autopay system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <FormField
          control={form.control}
          name="students"
          render={() => (
            <FormItem>
              <FormControl>
                <div className="space-y-4">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="h-12 w-full justify-between sm:h-10"
                        disabled={isLoading}
                      >
                        <span className="truncate text-sm text-muted-foreground sm:text-base">
                          {isLoading
                            ? 'Loading students...'
                            : 'Search students...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command>
                        <div className="flex items-center border-b px-3">
                          <Search className="h-4 w-4 shrink-0 opacity-50" />
                          <CommandInput
                            placeholder="Type a name to search..."
                            className="h-12 flex-1 text-base sm:h-11 sm:text-sm"
                          />
                        </div>
                        <CommandEmpty>No student found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto p-1">
                          {STUDENTS.map(renderStudentItem)}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <FormMessage />

                  <div className="space-y-3">
                    {selectedStudents.map((student) => {
                      const { price } = calculateStudentPrice(student)
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between rounded-lg border p-4"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium sm:text-base">
                              {student.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {student.familyId ? (
                                <>
                                  <span className="text-xs text-muted-foreground line-through sm:text-sm">
                                    ${student.monthlyRate}
                                  </span>
                                  <span className="text-xs font-medium sm:text-sm">
                                    ${price}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Family Discount
                                  </Badge>
                                </>
                              ) : (
                                <span className="text-xs font-medium sm:text-sm">
                                  ${student.monthlyRate}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStudentRemove(student.id)}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
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
          type="button"
          className="h-12 w-full text-base font-medium"
          disabled={selectedStudents.length === 0}
          onClick={() => onSubmit(form.getValues())}
        >
          Continue to Payment Details
        </Button>
      </CardFooter>
    </Card>
  )
}
