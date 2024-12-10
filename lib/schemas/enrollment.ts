import { z } from 'zod'
export const enrollmentSchema = z.object({
  students: z.array(z.string()).min(1, 'Please select at least one student'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
})

export type enrollmentSchemaType = z.infer<typeof enrollmentSchema>
