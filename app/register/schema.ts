import { EducationLevel, GradeLevel } from '@prisma/client'
import { Control } from 'react-hook-form'
import { z } from 'zod'

// Form Schema
export const studentFormSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: 'First name must be at least 2 characters' })
    .regex(/^[a-zA-Z\s-]+$/, {
      message: 'First name can only contain letters, spaces, and hyphens',
    }),
  lastName: z
    .string()
    .min(2, { message: 'Last name must be at least 2 characters' })
    .regex(/^[a-zA-Z\s-]+$/, {
      message: 'Last name can only contain letters, spaces, and hyphens',
    }),
  email: z
    .string()
    .email({ message: 'Please enter a valid email address' })
    .min(1, { message: 'Email is required' }),
  phone: z
    .string()
    .min(1, { message: 'Phone number is required' })
    .regex(/^\d{3}-\d{3}-\d{4}$/, {
      message: 'Phone number must be in XXX-XXX-XXXX format',
    }),
  schoolName: z
    .string()
    .min(2, { message: 'School name must be at least 2 characters' })
    .max(100, { message: 'School name cannot exceed 100 characters' }),
  educationLevel: z.nativeEnum(EducationLevel, {
    errorMap: () => ({ message: 'Please select your education level' }),
  }),
  gradeLevel: z
    .nativeEnum(GradeLevel, {
      errorMap: () => ({ message: 'Please select your grade level' }),
    })
    .nullable(),
  dateOfBirth: z
    .date({
      required_error: 'Date of birth is required',
      invalid_type_error: 'Please enter a valid date',
    })
    .max(new Date(), { message: 'Date of birth cannot be in the future' })
    .min(new Date('1900-01-01'), {
      message: 'Please enter a valid date of birth',
    }),
})

// Types
export type StudentFormValues = z.infer<typeof studentFormSchema>

export interface FormSectionProps {
  control: Control<StudentFormValues>
}
