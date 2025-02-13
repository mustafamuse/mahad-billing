import { z } from 'zod'

const currentYear = new Date().getFullYear()
const minYear = currentYear - 10
const maxYear = currentYear + 10

export const studentRegistrationSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  schoolName: z.string().min(1, 'School name is required'),
  educationLevel: z.string().min(1, 'Education level is required'),
  gradeLevel: z.string().min(1, 'Grade level is required'),
  highSchoolGraduated: z.boolean(),
  highSchoolGradYear: z
    .number()
    .min(minYear)
    .max(maxYear)
    .optional()
    .nullable(),
  collegeGraduated: z.boolean(),
  collegeGradYear: z.number().min(minYear).max(maxYear).optional().nullable(),
  postGradCompleted: z.boolean(),
  postGradYear: z.number().min(minYear).max(maxYear).optional().nullable(),
})

export type StudentRegistrationFormData = z.infer<
  typeof studentRegistrationSchema
>

export interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  schoolName: string
  educationLevel: string
  gradeLevel: string
  highSchoolGraduated: boolean
  highSchoolGradYear: number | null
  collegeGraduated: boolean
  collegeGradYear: number | null
  postGradCompleted: boolean
  postGradYear: number | null
  siblingGroup: {
    students: {
      id: string
      name: string
    }[]
  } | null
}

export const addSiblingSchema = z.object({
  siblingName: z.string().min(1, 'Sibling name is required'),
})
