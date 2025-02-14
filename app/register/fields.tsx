'use client'

import { useState } from 'react'

import { CalendarDate } from '@internationalized/date'
import { EducationLevel, GradeLevel } from '@prisma/client'
import { X, Loader2, UserPlus, Users } from 'lucide-react'
import { Control, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'

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
import {
  RegisterStudent,
  addSibling,
  removeSibling,
} from '@/lib/actions/register'

import { StudentSearch } from './components/student-search'
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

// Form Sections
export function PersonalSection({
  control,
}: {
  control: Control<StudentFormValues>
}) {
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legal First Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your legal first name"
                  {...field}
                  value={field.value || ''}
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legal Last Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your legal last name"
                  {...field}
                  value={field.value || ''}
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
            render={({ field }) => (
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
                        const jsDate = new Date(
                          date.year,
                          date.month - 1,
                          date.day
                        )
                        field.onChange(jsDate)
                      } else {
                        field.onChange(null)
                      }
                    }}
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

export function ContactSection({
  control,
}: {
  control: Control<StudentFormValues>
}) {
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter your email"
                  value={field.value || ''}
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
          render={({ field }) => (
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

export function EducationSection({
  control,
}: {
  control: Control<StudentFormValues>
}) {
  const { watch, setValue } = useFormContext<StudentFormValues>()
  const educationLevel = watch('educationLevel')

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
          render={({ field }) => (
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
                  <SelectTrigger>
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade Level</FormLabel>
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={educationLevel === EducationLevel.POST_GRAD}
              >
                <FormControl>
                  <SelectTrigger>
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter school name"
                    {...field}
                    value={field.value || ''}
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

export function SiblingSection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  control,
  student,
  students,
  onStudentUpdate,
}: {
  control: Control<StudentFormValues>
  student: RegisterStudent
  students: RegisterStudent[]
  onStudentUpdate: (updatedStudent: {
    id: string
    name?: string
    siblingGroup?: {
      students: { id: string; name: string }[]
    } | null
  }) => void
}) {
  const [showSiblingSearch, setShowSiblingSearch] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const siblings =
    student.siblingGroup?.students.filter((s) => s.id !== student.id) || []

  const handleAddSibling = async (selected: RegisterStudent) => {
    try {
      setIsLoading(selected.id)
      const result = await addSibling(student.id, selected.id)
      if (result.success) {
        toast.success('Sibling added successfully')
        if (result.student) {
          onStudentUpdate(result.student)
          setShowSiblingSearch(false)
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to add sibling')
    } finally {
      setIsLoading(null)
    }
  }

  const handleRemoveSibling = async (siblingId: string) => {
    try {
      setIsLoading(siblingId)
      const result = await removeSibling(student.id, siblingId)
      if (result.success) {
        toast.success('Sibling removed successfully')
        if (result.student) {
          onStudentUpdate(result.student)
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to remove sibling')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sibling Management"
        description="Manage your sibling relationships at the Mahad"
      />

      {siblings.length > 0 ? (
        <div className="rounded-lg border p-4">
          <div className="mb-4">
            <h4 className="font-medium">Current Siblings</h4>
            <p className="text-sm text-muted-foreground">
              You are in a sibling group with:
            </p>
          </div>
          <div className="space-y-2">
            {siblings.map((sibling) => (
              <div
                key={sibling.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <span className="font-medium">{sibling.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSibling(sibling.id)}
                  disabled={isLoading !== null}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {isLoading === sibling.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="mb-2 font-medium">No Siblings Added</h4>
          <p className="text-sm text-muted-foreground">
            Add siblings if you have any attending the Mahad.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSiblingSearch(true)}
          disabled={isLoading !== null}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Sibling
        </Button>
      </div>

      <Dialog open={showSiblingSearch} onOpenChange={setShowSiblingSearch}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Sibling</DialogTitle>
            <DialogDescription>
              Search for your sibling's name to add them to your sibling group.
            </DialogDescription>
          </DialogHeader>
          <StudentSearch
            students={students.filter(
              (s) =>
                s.id !== student.id && !siblings.some((sib) => sib.id === s.id)
            )}
            selectedStudent={null}
            onSelect={handleAddSibling}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
