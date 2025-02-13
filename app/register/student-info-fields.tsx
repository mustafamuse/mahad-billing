'use client'

import { useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDate } from '@internationalized/date'
import { EducationLevel, GradeLevel } from '@prisma/client'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { DateField, DateInput } from '@/components/ui/datefield-rac'
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

const studentFormSchema = z.object({
  email: z
    .string()
    .email({ message: 'Please enter a valid email address' })
    .nullable(),
  phone: z
    .string()
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .nullable(),
  schoolName: z
    .string()
    .min(2, { message: 'School name is required' })
    .nullable(),
  educationLevel: z.nativeEnum(EducationLevel, {
    required_error: 'Please select an education level',
  }),
  gradeLevel: z
    .nativeEnum(GradeLevel, {
      required_error: 'Please select a grade level',
    })
    .nullable(),
  dateOfBirth: z.date({
    required_error: 'Please select a date of birth',
  }),
})

type StudentFormValues = z.infer<typeof studentFormSchema>

interface StudentInfoFieldsProps {
  initialValues: {
    email: string | null
    phone: string | null
    schoolName: string | null
    educationLevel?: EducationLevel | null
    gradeLevel?: GradeLevel | null
    dateOfBirth?: Date | null
  } | null
  onUpdate: (values: StudentFormValues) => void
}

export function StudentInfoFields({
  initialValues,
  onUpdate,
}: StudentInfoFieldsProps) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      email: '',
      phone: '',
      schoolName: '',
      educationLevel: undefined,
      gradeLevel: null,
      dateOfBirth: undefined,
    },
  })

  useEffect(() => {
    if (initialValues) {
      form.reset({
        email: initialValues.email,
        phone: initialValues.phone,
        schoolName: initialValues.schoolName,
        educationLevel: initialValues.educationLevel as EducationLevel,
        gradeLevel: initialValues.gradeLevel as GradeLevel,
        dateOfBirth: initialValues.dateOfBirth || undefined,
      })
    }
  }, [initialValues, form])

  function onSubmit(data: StudentFormValues) {
    onUpdate(data)
  }

  return (
    <Form {...form}>
      <form onChange={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contact Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your email"
                      type="email"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your phone number"
                      type="tel"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Personal Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
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
                    >
                      <DateInput />
                    </DateField>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Education Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Education Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your school name"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="educationLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Education Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EducationLevel.HIGH_SCHOOL}>
                        High School
                      </SelectItem>
                      <SelectItem value={EducationLevel.COLLEGE}>
                        College
                      </SelectItem>
                      <SelectItem value={EducationLevel.POST_GRAD}>
                        Post Graduate
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gradeLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                    disabled={
                      form.watch('educationLevel') === EducationLevel.POST_GRAD
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={GradeLevel.FRESHMAN}>
                        Freshman
                      </SelectItem>
                      <SelectItem value={GradeLevel.SOPHOMORE}>
                        Sophomore
                      </SelectItem>
                      <SelectItem value={GradeLevel.JUNIOR}>Junior</SelectItem>
                      <SelectItem value={GradeLevel.SENIOR}>Senior</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  )
}
