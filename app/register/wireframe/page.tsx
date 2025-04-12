'use client'

import { useState, useEffect, useCallback } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDate } from '@internationalized/date'
import { EducationLevel, GradeLevel } from '@prisma/client'
import { AlertTriangle, UserPlus, X, Check, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DateField, DateInput } from '@/components/ui/date-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getRegistrationStudents,
  registerWithSiblings,
} from '@/lib/actions/register'
import { cn } from '@/lib/utils'

import { studentFormSchema, type StudentFormValues } from '../schema'

// Phone number formatting function
function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  return cleaned.length === 10
    ? cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
    : cleaned
}

interface SearchResult {
  id: string
  name: string
  lastName: string
}

const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  FRESHMAN: 'Freshman',
  SOPHOMORE: 'Sophomore',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
}

// Add debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function WireframePage() {
  const [formData, setFormData] = useState<StudentFormValues | null>(null)
  const [showSiblingPrompt, setShowSiblingPrompt] = useState(false)
  const [showSiblingSearch, setShowSiblingSearch] = useState(false)
  const [showSiblingSection, setShowSiblingSection] = useState(false)
  const [siblings, setSiblings] = useState<SearchResult[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedStudent, setSelectedStudent] = useState<SearchResult | null>(
    null
  )
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounced search function
  const debouncedSearch = debounce(async (query: string) => {
    if (query.length >= 2) {
      await searchSiblings(query)
    } else {
      setSearchResults([])
    }
  }, 300)

  // Search function using actual API
  const searchSiblings = async (query: string) => {
    if (!formData?.lastName) {
      toast.error('Complete your details first', {
        description:
          'Please fill in your personal information before searching for siblings',
      })
      return
    }

    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    try {
      const students = await getRegistrationStudents()

      // Enhanced filtering
      const results = students
        .filter((student) => {
          const studentLastName = student.name
            .split(' ')
            .slice(-1)[0]
            .toLowerCase()
          const searchLastName = formData.lastName.toLowerCase()
          const searchQuery = query.toLowerCase()

          return (
            studentLastName === searchLastName && // Exact last name match
            student.name.toLowerCase().includes(searchQuery) && // Name contains search query
            !siblings.some((sib) => sib.id === student.id) // Not already added
          )
        })
        .map((student) => ({
          id: student.id,
          name: student.name,
          lastName: student.name.split(' ').slice(-1)[0],
        }))

      setSearchResults(results)

      // Only show "no results" message in the UI, not as a toast
    } catch (error) {
      console.error('Error searching siblings:', error)
      toast.error('Unable to search for siblings', {
        description:
          'Please try again or contact support if the issue persists',
      })
      setSearchResults([])
    }
  }

  // Add sibling handler with improved toast feedback
  const handleAddSelectedSibling = () => {
    if (selectedStudent) {
      setSiblings((prev) => [...prev, selectedStudent])
      setSelectedStudent(null)
      setSearchResults([])
      setSearchTerm('')
      setShowSiblingSearch(false)
    }
  }

  // Form setup with proper typing
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: undefined,
      educationLevel: undefined,
      gradeLevel: null,
      schoolName: '',
    },
  })

  // Add email validation on blur
  const validateEmail = async (email: string) => {
    if (!email) return true

    setIsCheckingEmail(true)
    try {
      const students = await getRegistrationStudents()
      const exists = students.some((student) => student.email === email)

      if (exists) {
        form.setError('email', {
          type: 'manual',
          message: 'This email is already registered',
        })
        return false
      }

      form.clearErrors('email')
      return true
    } catch (error) {
      console.error('Error checking email:', error)
      return true // Allow submission on error, we'll catch it server-side
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleSubmit = async (data: StudentFormValues) => {
    // Validate email before proceeding
    const isEmailValid = await validateEmail(data.email)
    if (!isEmailValid) {
      toast.error('This email is already registered', {
        description: 'Please use a different email address',
      })
      return
    }

    setFormData(data)
    setShowSiblingPrompt(true)
  }

  // Handle registration for students with no siblings
  const handleNoSiblingsRegistration = useCallback(async () => {
    if (!formData || isSubmitting) return
    setIsSubmitting(true)

    const registrationPromise = registerWithSiblings({
      studentData: formData,
      siblingIds: null,
    })

    try {
      await toast.promise(registrationPromise, {
        loading: 'Processing your registration...',
        success: 'Registration complete! Redirecting to payment...',
        error: 'Registration failed. Please try again.',
      })

      const result = await registrationPromise

      if (result) {
        form.reset()
        setFormData(null)
        setShowSiblingPrompt(false)
        // Short delay to allow the success toast to be seen
        setTimeout(() => {
          window.location.href = 'https://buy.stripe.com/fZeg0O7va1gt4da3cc'
        }, 1500)
      }
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting, form])

  // Handle registration for students with siblings
  const handleSiblingRegistration = useCallback(async () => {
    if (!formData || isSubmitting) return
    setIsSubmitting(true)

    const loadingMessage =
      siblings.length > 0
        ? `Registering you with ${siblings.length} sibling${siblings.length > 1 ? 's' : ''}...`
        : 'Processing your registration...'

    const successMessage =
      siblings.length > 0
        ? `Registration complete! Redirecting to payment for ${siblings.length + 1} students...`
        : 'Registration complete! Redirecting to payment...'

    const registrationPromise = registerWithSiblings({
      studentData: formData,
      siblingIds: siblings.map((s) => s.id),
    })

    try {
      await toast.promise(registrationPromise, {
        loading: loadingMessage,
        success: successMessage,
        error: 'Registration failed. Please try again.',
      })

      const result = await registrationPromise

      if (result) {
        form.reset()
        setFormData(null)
        setSiblings([])
        setShowSiblingSection(false)
        // Short delay to allow the success toast to be seen
        setTimeout(() => {
          window.location.href = 'https://buy.stripe.com/fZeg0O7va1gt4da3cc'
        }, 1500)
      }
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting, siblings, form])

  // Effect to handle state updates after registration
  useEffect(() => {
    return () => {
      // Cleanup any pending state updates
      setIsSubmitting(false)
    }
  }, [])

  return (
    <div className="container max-w-3xl space-y-8 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Student Registration</h1>
        <p className="text-muted-foreground">
          Please fill out the form below to register for the Mahad
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Please provide your legal name</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Legal First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your legal first name"
                          {...field}
                          value={field.value || ''}
                          aria-invalid={!!fieldState.error}
                          className={cn(
                            fieldState.error &&
                              'border-destructive focus-visible:ring-destructive'
                          )}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        First name as it appears on legal documents
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Legal Last Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your legal last name"
                          {...field}
                          value={field.value || ''}
                          aria-invalid={!!fieldState.error}
                          className={cn(
                            fieldState.error &&
                              'border-destructive focus-visible:ring-destructive'
                          )}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Last name as it appears on legal documents
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                            value={field.value || ''}
                            onBlur={async (e) => {
                              field.onBlur()
                              await validateEmail(e.target.value)
                            }}
                            aria-invalid={!!fieldState.error}
                            className={cn(
                              fieldState.error &&
                                'border-destructive focus-visible:ring-destructive',
                              isCheckingEmail && 'pr-10'
                            )}
                          />
                          {isCheckingEmail && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Enter your email address
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="XXX-XXX-XXXX"
                          type="tel"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value)
                            field.onChange(formatted)
                          }}
                          aria-invalid={!!fieldState.error}
                          className={cn(
                            fieldState.error &&
                              'border-destructive focus-visible:ring-destructive'
                          )}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Enter your whatsapp number
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date of Birth Field */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <DateField
                          value={
                            field.value
                              ? new CalendarDate(
                                  field.value.getFullYear(),
                                  field.value.getMonth() + 1,
                                  field.value.getDate()
                                )
                              : null
                          }
                          onChange={(date) => {
                            if (date) {
                              field.onChange(
                                new Date(date.year, date.month - 1, date.day)
                              )
                            } else {
                              field.onChange(null)
                            }
                          }}
                          aria-invalid={!!fieldState.error}
                          aria-label="Date of Birth"
                        >
                          <DateInput />
                        </DateField>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        MM/DD/YYYY
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Education Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Education Level</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger
                            aria-invalid={!!fieldState.error}
                            className={cn(
                              fieldState.error &&
                                'border-destructive focus-visible:ring-destructive'
                            )}
                          >
                            <SelectValue placeholder="Select education level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(EducationLevel).map((level) => (
                            <SelectItem key={level} value={level}>
                              {level.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select your current/last academic level
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gradeLevel"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Grade Level</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger
                            aria-invalid={!!fieldState.error}
                            className={cn(
                              fieldState.error &&
                                'border-destructive focus-visible:ring-destructive'
                            )}
                          >
                            <SelectValue placeholder="Select grade level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(GradeLevel).map((level) => (
                            <SelectItem key={level} value={level}>
                              {GRADE_LEVEL_LABELS[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select your current/last grade
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* School Name Field */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          placeholder="Enter school name"
                          aria-invalid={!!fieldState.error}
                          className={cn(
                            fieldState.error &&
                              'border-destructive focus-visible:ring-destructive'
                          )}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Name of your school or institution
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Only show the Next button if we're not in sibling section */}
              {!showSiblingSection && (
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Next: Sibling Info'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Sibling Management Section */}
      {showSiblingSection && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sibling Registration</CardTitle>
            <CardDescription className="text-base">
              Add your siblings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h4 className="text-lg font-medium">Siblings to Add</h4>
                <p className="text-sm text-muted-foreground">
                  {siblings.length
                    ? `${siblings.length} sibling${siblings.length > 1 ? 's' : ''} added`
                    : 'No siblings added yet'}
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="flex w-full items-center gap-2 sm:w-auto"
                onClick={() => setShowSiblingSearch(true)}
              >
                <UserPlus className="h-5 w-5" />
                Add a Sibling
              </Button>
            </div>

            {siblings.length > 0 && (
              <div className="rounded-xl border bg-card">
                {siblings.map((sibling, index) => (
                  <div
                    key={sibling.id}
                    className={cn(
                      'flex items-center justify-between p-4',
                      index !== siblings.length - 1 && 'border-b'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {sibling.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{sibling.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Sibling #{index + 1}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setSiblings((prev) =>
                          prev.filter((s) => s.id !== sibling.id)
                        )
                      }}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove sibling</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 pt-4">
              <Button
                onClick={handleSiblingRegistration}
                className="w-full"
                size="lg"
                variant="default"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sibling Prompt Dialog */}
      <Dialog open={showSiblingPrompt} onOpenChange={setShowSiblingPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              Do you have any siblings at the Mahad?
            </DialogTitle>
            <br />
            <DialogDescription className="text-center">
              Let us know if you have any siblings currently enrolled at the
              Mahad. This helps us keep family records together.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={handleNoSiblingsRegistration}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'No, Continue to Payment'
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setShowSiblingPrompt(false)
                setShowSiblingSection(true)
              }}
              disabled={isSubmitting}
            >
              Yes, Add a Sibling
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sibling Search Dialog */}
      <Dialog open={showSiblingSearch} onOpenChange={setShowSiblingSearch}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add a Sibling</DialogTitle>
            <DialogDescription>
              Search for siblings with last name &quot;{formData?.lastName}
              &quot;
            </DialogDescription>
            <div className="mt-2 rounded-md border-l-4 border-orange-200 bg-orange-50/30 p-4 dark:border-orange-400/20 dark:bg-orange-400/5">
              <div className="flex items-center justify-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">Important</span>
              </div>
              <div className="mt-2 text-center text-sm text-orange-600 dark:text-orange-300/90">
                <span>Please note:</span>
                <ul className="mt-1 list-none space-y-1">
                  <li>• Only siblings with the same last name will appear</li>
                  <li>• Your sibling must be registered at the Mahad</li>
                </ul>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchTerm(value)
                  debouncedSearch(value)
                }}
              />
            </div>

            <div className="max-h-[200px] overflow-y-auto rounded-lg border">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm font-medium">
                    {!formData?.lastName
                      ? 'Please complete personal details first'
                      : searchTerm.length < 2
                        ? 'Type at least 2 characters to search'
                        : 'No siblings found with the same last name'}
                  </p>
                  {searchTerm.length >= 2 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Make sure your sibling is registered with the same last
                      name
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {searchResults.map((student) => (
                    <div
                      key={student.id}
                      className={`flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50 ${
                        selectedStudent?.id === student.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div>
                        <p className="font-medium">{student.name}</p>
                      </div>
                      {selectedStudent?.id === student.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowSiblingSearch(false)
                  setSearchTerm('')
                  setSearchResults([])
                  setSelectedStudent(null)
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddSelectedSibling}
                disabled={!selectedStudent}
              >
                Add Sibling
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
