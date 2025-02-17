'use server'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'

export async function updateStudent(
  id: string,
  data: Prisma.StudentUpdateInput
) {
  try {
    return {
      student: await prisma.student.update({
        where: { id },
        data,
      }),
    }
  } catch (error) {
    console.error('Failed to update student:', error)
    throw new Error('Failed to update student information')
  }
}
