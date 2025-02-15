import { EducationLevel, GradeLevel } from '@prisma/client'

import { StudentFormValues } from './schema'

// Base Student Type
export interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  dateOfBirth: Date | null
  educationLevel: EducationLevel | null
  gradeLevel: GradeLevel | null
  schoolName: string | null
}

// Student with Siblings
export interface StudentWithSiblings extends Student {
  siblingGroup: {
    students: Array<{
      id: string
      name: string
    }>
  } | null
}

// Mutation Responses
export interface StudentMutationResponse {
  success: boolean
  student: StudentWithSiblings | null
  message?: string
}

// Mutation Variables
export interface UpdateStudentVariables {
  id: string
  values: StudentFormValues
}

export interface ManageSiblingVariables {
  type: 'add' | 'remove'
  studentId: string
  siblingId: string
}

// Query Context
export interface QueryContext {
  previousStudent?: StudentWithSiblings
  previousStudents?: StudentWithSiblings[]
}
