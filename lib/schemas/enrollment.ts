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

export const enrollmentSchema = z.object({
  students: z.array(z.string()).min(1, 'Please select at least one student'),
  relationship: z.enum(relationshipTypes, {
    required_error: 'Please select your relationship to the student',
  }),
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
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  setupIntentId: z.string().optional(),
})

export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>
export type RelationshipType = (typeof relationshipTypes)[number]

export const EnrollmentApiSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  relationship: z.enum([
    'self',
    'father',
    'mother',
    'sibling',
    'uncle',
    'aunt',
    'step-father',
    'step-mother',
    'other',
  ]),
  total: z.number(),
  studentIds: z.array(z.string()).min(1, 'Please select at least one student'),
})

export type EnrollmentApiValues = z.infer<typeof EnrollmentApiSchema>
