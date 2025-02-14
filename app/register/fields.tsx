'use client'

import { CalendarDate } from '@internationalized/date'
import { EducationLevel, GradeLevel } from '@prisma/client'
import { Control, useFormContext } from 'react-hook-form'

import { DateField, DateInput } from '@/components/ui/datefield-rac'
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
