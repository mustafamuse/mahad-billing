import { EducationLevel, GradeLevel } from '@prisma/client'

import { RegisterStudent } from '@/lib/actions/register'

import { StudentFormValues } from './schema'

export function getFormInitialValues(
  student: RegisterStudent
): StudentFormValues {
  const [firstName = '', lastName = ''] = student.name.split(' ')

  return {
    firstName,
    lastName,
    email: student.email || '',
    phone: student.phone || '',
    schoolName: student.schoolName || '',
    educationLevel: student.educationLevel as EducationLevel,
    gradeLevel: (student.gradeLevel as GradeLevel) || null,
    dateOfBirth: student.dateOfBirth
      ? new Date(student.dateOfBirth)
      : new Date(),
  }
}

export function combineFormValues(values: StudentFormValues) {
  return {
    ...values,
    name: `${values.firstName} ${values.lastName}`.trim(),
  }
}
