'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { Prisma } from '@prisma/client'
import { Ratelimit } from '@upstash/ratelimit'

import {
  studentFormSchema,
  type StudentFormValues,
} from '@/app/register/schema'
import { prisma } from '@/lib/db'

import { redis } from '../utils/redis'

// Create rate limiter
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})

// Helper function for consistent capitalization
function capitalizeNames(firstName: string, lastName: string) {
  return {
    firstName: firstName.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    lastName: lastName.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
  }
}

// Get students for registration
export async function getRegistrationStudents() {
  const CUTOFF_DATE = new Date('2024-02-13')

  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        educationLevel: true,
        gradeLevel: true,
        schoolName: true,
        updatedAt: true,
        siblingGroup: {
          select: {
            students: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Filter out students who completed registration after cutoff
    return students
      .filter((student) => {
        const hasCompletedRegistration =
          student.email &&
          student.phone &&
          student.dateOfBirth &&
          student.educationLevel &&
          student.gradeLevel &&
          student.schoolName

        const wasUpdatedAfterCutoff = student.updatedAt > CUTOFF_DATE

        // If student completed registration after cutoff, exclude them
        if (hasCompletedRegistration && wasUpdatedAfterCutoff) {
          console.log('Student excluded from list:', {
            id: student.id,
            name: student.name,
            updatedAt: student.updatedAt,
            reason: 'Completed registration after cutoff date',
          })
          return false
        }

        return true
      })

      .map(({ updatedAt: _, ...student }) => student) // Remove updatedAt from returned data
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
    const ip = headers().get('x-forwarded-for') ?? '127.0.0.1'
    const { success, reset } = await ratelimit.limit(ip)

    if (!success) {
      throw new Error(
        `Too many updates. Please wait ${Math.ceil(
          (reset - Date.now()) / 1000
        )} seconds.`
      )
    }

    // If name is being updated, capitalize it
    if (typeof data.name === 'string') {
      const [firstName, ...lastNames] = data.name.split(' ')
      const { firstName: capFirst, lastName: capLast } = capitalizeNames(
        firstName,
        lastNames.join(' ')
      )
      data.name = `${capFirst} ${capLast}`.trim()
    }

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

    // Revalidate the entire registration route
    revalidatePath('/register', 'layout')

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

export async function addSibling(studentId: string, siblingId: string) {
  try {
    const [student, sibling] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, siblingGroupId: true },
      }),
      prisma.student.findUnique({
        where: { id: siblingId },
        select: { id: true, siblingGroupId: true },
      }),
    ])

    if (!student || !sibling) {
      throw new Error('One or both students not found')
    }

    // Create sibling group only when neither student has one
    if (!student.siblingGroupId && !sibling.siblingGroupId) {
      await prisma.sibling.create({
        data: {
          students: {
            connect: [{ id: studentId }, { id: siblingId }],
          },
        },
      })
    } else if (student.siblingGroupId && !sibling.siblingGroupId) {
      await prisma.student.update({
        where: { id: siblingId },
        data: { siblingGroupId: student.siblingGroupId },
      })
    } else if (!student.siblingGroupId && sibling.siblingGroupId) {
      await prisma.student.update({
        where: { id: studentId },
        data: { siblingGroupId: sibling.siblingGroupId },
      })
    } else if (student.siblingGroupId !== sibling.siblingGroupId) {
      await prisma.$transaction([
        prisma.student.updateMany({
          where: { siblingGroupId: sibling.siblingGroupId },
          data: { siblingGroupId: student.siblingGroupId },
        }),
        prisma.sibling.delete({ where: { id: sibling.siblingGroupId! } }),
      ])
    }

    // Get full student data
    const updatedStudent = await prisma.student.findUnique({
      where: { id: studentId },
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
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Revalidate the entire registration route
    revalidatePath('/register', 'layout')

    return { success: true, student: updatedStudent }
  } catch (error) {
    console.error('Failed to add sibling:', error)
    throw new Error('Failed to add sibling')
  }
}

export async function removeSibling(studentId: string, siblingId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, siblingGroupId: true },
    })

    if (!student || !student.siblingGroupId) {
      throw new Error('Student or sibling group not found')
    }

    // Remove sibling from the group
    await prisma.student.update({
      where: { id: siblingId },
      data: { siblingGroupId: null },
    })

    // Count remaining members in the group
    const remainingMembers = await prisma.student.count({
      where: { siblingGroupId: student.siblingGroupId },
    })

    if (remainingMembers <= 1) {
      await prisma.$transaction([
        prisma.student.updateMany({
          where: { siblingGroupId: student.siblingGroupId },
          data: { siblingGroupId: null },
        }),
        prisma.sibling.delete({ where: { id: student.siblingGroupId } }),
      ])
    }

    const updatedStudent = await prisma.student.findUnique({
      where: { id: studentId },
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
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Revalidate the entire registration route
    revalidatePath('/register', 'layout')

    return { success: true, student: updatedStudent }
  } catch (error) {
    console.error('Failed to remove sibling:', error)
    throw new Error('Failed to remove sibling')
  }
}

export async function getRegistrationStudent(id: string) {
  const CUTOFF_DATE = new Date('2024-02-13')

  try {
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        educationLevel: true,
        gradeLevel: true,
        schoolName: true,
        updatedAt: true,
        siblingGroup: {
          select: {
            students: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!student) return null

    // Check if student has completed registration after cutoff date
    const hasCompletedRegistration =
      student.email &&
      student.phone &&
      student.dateOfBirth &&
      student.educationLevel &&
      student.gradeLevel &&
      student.schoolName

    const wasUpdatedAfterCutoff = student.updatedAt > CUTOFF_DATE

    // If student completed registration after cutoff, don't return them
    if (hasCompletedRegistration && wasUpdatedAfterCutoff) {
      console.log('Student excluded:', {
        id: student.id,
        name: student.name,
        updatedAt: student.updatedAt,
        reason: 'Completed registration after cutoff date',
      })
      return null
    }

    // Return student without the updatedAt field
    const { updatedAt: _, ...studentData } = student
    return studentData
  } catch (error) {
    console.error('Failed to fetch student:', error)
    throw new Error('Failed to fetch student')
  }
}

export async function createRegistrationStudent(data: StudentFormValues) {
  try {
    // Validate using schema
    const validated = studentFormSchema.parse(data)

    // Capitalize names
    const { firstName, lastName } = capitalizeNames(
      validated.firstName,
      validated.lastName
    )

    const student = await prisma.student.create({
      data: {
        name: `${firstName} ${lastName}`.trim(),
        email: validated.email,
        phone: validated.phone,
        dateOfBirth: validated.dateOfBirth,
        educationLevel: validated.educationLevel,
        gradeLevel: validated.gradeLevel,
        schoolName: validated.schoolName,
      },
      include: {
        siblingGroup: {
          include: {
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
      success: true,
      student,
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('A student with this email already exists')
      }
    }
    console.error('Failed to create student:', error)
    throw new Error('Failed to create student registration')
  }
}
