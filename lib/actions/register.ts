'use server'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'

// Get students for registration
export async function getRegistrationStudents() {
  try {
    return await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        educationLevel: true,
        gradeLevel: true,
        schoolName: true,
        siblingGroup: {
          select: {
            students: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
  } catch (error) {
    console.error('Failed to fetch students:', error)
    throw new Error('Failed to fetch students')
  }
}

// Update student registration info
export async function updateRegistrationStudent(
  id: string,
  data: Prisma.StudentUpdateInput
) {
  try {
    const updatedStudent = await prisma.student.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        educationLevel: true,
        gradeLevel: true,
        schoolName: true,
        siblingGroup: {
          select: {
            students: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    return {
      student: updatedStudent,
      success: true,
      message: 'Student information updated successfully',
    }
  } catch (error) {
    console.error('Failed to update student:', error)
    throw new Error('Failed to update student information')
  }
}

export type RegisterStudent = Awaited<
  ReturnType<typeof getRegistrationStudents>
>[0]
