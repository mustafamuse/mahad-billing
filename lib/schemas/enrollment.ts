import { z } from 'zod'

// Base schema for payor details
export const payerDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(1, "Payor's phone number is required")
    .regex(
      /^\d{3}-\d{3}-\d{4}$/,
      'Phone number must be in format: XXX-XXX-XXXX'
    ),
  relationship: z.string().min(1, 'Relationship is required'),
})

// Schema for prepare-setup endpoint
export const prepareSetupSchema = z.object({
  payerDetails: payerDetailsSchema,
  studentIds: z.array(z.string()).min(1, 'At least one student is required'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'Terms must be accepted',
  }),
})

export type PrepareSetupInput = z.infer<typeof prepareSetupSchema>

// Schema for the enrollment form
export const enrollmentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  students: z.array(z.string()).min(1, 'Please select at least one student'),
})

// Schema for the API request
export const EnrollmentApiSchema = payerDetailsSchema.extend({
  studentIds: z.array(z.string()).min(1, 'Please select at least one student'),
})

export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>
export type EnrollmentApiValues = z.infer<typeof EnrollmentApiSchema>

// Error types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}
