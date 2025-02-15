'use client'

import { useState } from 'react'

import { CalendarDate } from '@internationalized/date'
import { EducationLevel, GradeLevel } from '@prisma/client'
import { X, UserPlus, AlertTriangle } from 'lucide-react'
import { Control, useFormContext } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DateField, DateInput } from '@/components/ui/datefield-rac'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
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
import { RegisterStudent } from '@/lib/actions/register'
import { cn } from '@/lib/utils'

import { StudentSearch } from './components/student-search'
import { useStudentMutations } from './hooks/use-student-mutations'
import { StudentFormValues } from './schema'

// Reusable Form Input Component
interface FormInputProps {
  control: Control<StudentFormValues>
  name: Extract<
    keyof StudentFormValues,
    'firstName' | 'lastName' | 'email' | 'phone' | 'schoolName'
  > // Only string fields
  label: string
  placeholder?: string
  type?: string
}

export function FormInput({
  control,
  name,
  label,
  placeholder,
  type = 'text',
}: FormInputProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              type={type}
              {...field}
              value={field.value || ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

// Section Header Component
interface SectionHeaderProps {
  title: string
  description: string
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="border-b pb-2">
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function SectionSkeleton({ inputCount = 2 }: { inputCount?: number }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-2">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: inputCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Update props interface for each section
interface SectionProps {
  control: Control<StudentFormValues>
  isLoading?: boolean
}

export function PersonalSection({ control, isLoading }: SectionProps) {
  if (isLoading) {
    return <SectionSkeleton inputCount={3} />
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Personal Information"
        description="Please provide your legal name"
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          control={control}
          name="firstName"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Legal First Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder="Enter your legal first name"
                  aria-invalid={!!fieldState.error}
                  className={cn(
                    fieldState.error &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Your first name as it appears on legal documents
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lastName"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Legal Last Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder="Enter your legal last name"
                  aria-invalid={!!fieldState.error}
                  className={cn(
                    fieldState.error &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Your last name as it appears on legal documents
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="sm:col-span-2">
          <FormField
            control={control}
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
                <p className="text-xs text-muted-foreground">MM/DD/YYYY</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )
}

function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  return cleaned.length === 10
    ? cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
    : cleaned
}

export function ContactSection({ control, isLoading }: SectionProps) {
  if (isLoading) return <SectionSkeleton inputCount={2} />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Contact Information"
        description="Your contact details"
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter your email"
                  value={field.value || ''}
                  aria-invalid={!!fieldState.error}
                  className={cn(
                    fieldState.error &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Enter your email address
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
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
    </div>
  )
}

const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
  FRESHMAN: 'Freshman',
  SOPHOMORE: 'Sophomore',
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
}

export function EducationSection({ control, isLoading }: SectionProps) {
  const { watch, setValue } = useFormContext<StudentFormValues>()
  const educationLevel = watch('educationLevel')

  if (isLoading) return <SectionSkeleton inputCount={3} />

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Education Information"
        description="Current or most recent academic details"
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <FormField
          control={control}
          name="educationLevel"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Education Level</FormLabel>
              <Select
                value={field.value || undefined}
                onValueChange={(value) => {
                  field.onChange(value)
                  if (value === EducationLevel.POST_GRAD) {
                    setValue('gradeLevel', null)
                  }
                }}
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
          control={control}
          name="gradeLevel"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Grade Level</FormLabel>
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={educationLevel === EducationLevel.POST_GRAD}
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
        <div className="sm:col-span-2">
          <FormField
            control={control}
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
      </div>
    </div>
  )
}

interface Props {
  student: RegisterStudent
  students: RegisterStudent[]
  onStudentUpdate: (student: RegisterStudent) => void
}

export function SiblingSection({ student, students, onStudentUpdate }: Props) {
  const { manageSiblings } = useStudentMutations()
  const [showSiblingSearch, setShowSiblingSearch] = useState(false)
  const siblings =
    student.siblingGroup?.students.filter(
      (s: { id: string }) => s.id !== student.id
    ) || []

  const handleAddSibling = async (selected: RegisterStudent) => {
    const result = await manageSiblings.mutateAsync({
      type: 'add',
      studentId: student.id,
      siblingId: selected.id,
    })
    if (result.success && result.student) {
      onStudentUpdate(result.student)
      setShowSiblingSearch(false)
    }
  }

  const handleRemoveSibling = async (siblingId: string) => {
    const result = await manageSiblings.mutateAsync({
      type: 'remove',
      studentId: student.id,
      siblingId,
    })
    if (result.success && result.student) {
      onStudentUpdate(result.student)
    }
  }

  const filteredStudents = students.filter(
    (s: { id: string; name: string }) =>
      s.id !== student.id &&
      !siblings.some((sib: { id: string }) => sib.id === s.id) &&
      s.name.split(' ').pop() === student.name.split(' ').pop()
  )

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Siblings"
        description="Connect with your siblings at the Mahad"
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="font-medium">Your Siblings</h4>
            <p className="text-sm text-muted-foreground">
              {siblings.length
                ? `${siblings.length} sibling${siblings.length > 1 ? 's' : ''} connected`
                : 'No siblings connected'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSiblingSearch(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Sibling
          </Button>
        </div>

        {siblings.length > 0 ? (
          <div className="space-y-2">
            {siblings.map((sibling) => (
              <div
                key={sibling.id}
                className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
              >
                <span className="font-medium">{sibling.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSibling(sibling.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              If you have <strong>siblings</strong> attending the Mahad, let us
              know here.
            </p>
          </div>
        )}
      </div>

      <Dialog open={showSiblingSearch} onOpenChange={setShowSiblingSearch}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add a Sibling</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-2 rounded-md border-l-4 border-orange-200 bg-orange-50/30 p-4 dark:border-orange-400/20 dark:bg-orange-400/5">
                <div className="flex items-center justify-center gap-2 text-orange-700 dark:text-orange-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    Important Notice
                  </span>
                </div>
                <div className="mt-2 text-center text-sm text-orange-600 dark:text-orange-300/90">
                  <span>Please ensure:</span>
                  <ul className="mt-1 list-none space-y-1">
                    <li>
                      • You are only adding your{' '}
                      <strong>"actual siblings"</strong>
                    </li>
                    <li>• Your sibling has registered their own account</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <StudentSearch
            students={filteredStudents}
            selectedStudent={null}
            onSelect={handleAddSibling}
            placeholder="Search for your sibling's name..."
            emptyMessage={
              <div className="px-2 py-6 text-center">
                <p className="text-sm font-medium">No siblings found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ask your sibling to register first, then they can add you!
                </p>
              </div>
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
