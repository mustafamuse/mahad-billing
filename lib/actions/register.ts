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

// Function to calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Function to calculate similarity percentage
function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  const maxLength = Math.max(a.length, b.length)
  return Math.round(((maxLength - distance) / maxLength) * 100)
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

    const fullName = `${firstName} ${lastName}`.trim()

    // Check if student with this email already exists
    if (validated.email) {
      const existingStudent = await prisma.student.findFirst({
        where: { email: validated.email },
      })

      if (existingStudent) {
        throw new Error('A student with this email already exists')
      }
    }

    // Check for exact name match
    const exactNameMatch = await prisma.student.findFirst({
      where: {
        name: {
          equals: fullName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (exactNameMatch) {
      throw new Error(
        `A student with the exact name "${fullName}" already exists (ID: ${exactNameMatch.id}, Email: ${exactNameMatch.email || 'None'})`
      )
    }

    // Check for similar names
    const similarityThreshold = 90 // Higher threshold for server-side validation
    const allStudents = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const similarNames = allStudents.filter((s) => {
      const similarity = calculateSimilarity(s.name, fullName)
      return similarity >= similarityThreshold && similarity < 100 // Less than 100 to exclude exact matches
    })

    if (similarNames.length > 0) {
      const similarNamesInfo = similarNames
        .map((s) => `"${s.name}" (ID: ${s.id}, Email: ${s.email || 'None'})`)
        .join(', ')

      console.warn(
        `Creating student with name "${fullName}" that is similar to existing students: ${similarNamesInfo}`
      )
      // We're just logging a warning here, not throwing an error
      // This allows the registration to proceed but keeps a record of potential duplicates
    }

    const student = await prisma.student.create({
      data: {
        name: fullName,
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
    throw error instanceof Error
      ? error
      : new Error('Failed to create student registration')
  }
}
