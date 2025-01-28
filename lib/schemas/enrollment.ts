import { z } from 'zod'

const relationshipTypes = [
  'self',
  'father',
  'mother',
  'sibling',
  'uncle',
  'aunt',
  'step-father',
  'step-mother',
  'other',
] as const

export type RelationshipType = (typeof relationshipTypes)[number]

// Base schema for payor details
const payorDetailsSchema = z.object({
  firstName: z.string().min(1, "Payor's first name is required"),
  lastName: z.string().min(1, "Payor's last name is required"),
  email: z
    .string()
    .min(1, "Payor's email is required")
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .min(1, "Payor's phone number is required")
    .refine((val) => val.replace(/\D/g, '').length === 10, {
      message: 'Phone number must be exactly 10 digits',
    }),
  relationship: z.enum(relationshipTypes, {
    required_error: 'Please select your relationship to the student',
  }),
})

// Schema for prepare-setup endpoint
export const prepareSetupSchema = payorDetailsSchema.extend({
  studentIds: z.array(z.string()).min(1, 'Please select at least one student'),
})

// Schema for the enrollment form
export const enrollmentSchema = payorDetailsSchema.extend({
  students: z.array(z.string()).min(1, 'Please select at least one student'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  setupIntentId: z.string().optional(),
})

// Schema for the API request
export const EnrollmentApiSchema = payorDetailsSchema.extend({
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
