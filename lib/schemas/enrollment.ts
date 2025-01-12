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
    .min(14, 'Phone number must be in format (XXX) XXX-XXXX')
    .regex(
      /^\(\d{3}\) \d{3}-\d{4}$/,
      'Phone number must be in format (XXX) XXX-XXXX'
    ),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
})

export type EnrollmentFormValues = z.infer<typeof enrollmentSchema>
export type RelationshipType = (typeof relationshipTypes)[number]
