import { EducationLevel, GradeLevel } from '@prisma/client'

import type { RegisterStudent } from '@/lib/actions/register'

import type { StudentFormValues } from './schema'

export function getFormInitialValues(
  student?: RegisterStudent | null
): StudentFormValues {
  if (!student) {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: new Date(),
      educationLevel: EducationLevel.HIGH_SCHOOL, // Default enum value
      gradeLevel: GradeLevel.FRESHMAN, // Default enum value
      schoolName: '',
    }
  }

  const [firstName = '', lastName = ''] = student.name?.split(' ') || ['', '']

  return {
    firstName,
    lastName,
    email: student.email || '',
    phone: student.phone || '',
    dateOfBirth: student.dateOfBirth
      ? new Date(student.dateOfBirth)
      : new Date(),
    educationLevel: student.educationLevel || EducationLevel.HIGH_SCHOOL,
    gradeLevel: student.gradeLevel || GradeLevel.FRESHMAN,
    schoolName: student.schoolName || '',
  }
}

export function combineFormValues(values: StudentFormValues) {
  return {
    ...values,
    name: `${values.firstName} ${values.lastName}`.trim(),
  }
}
