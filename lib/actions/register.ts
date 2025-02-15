'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { Prisma } from '@prisma/client'
import { Ratelimit } from '@upstash/ratelimit'

import { prisma } from '@/lib/db'
import { monitoring } from '@/lib/monitoring'

import { redis } from '../utils/redis'
// Create rate limiter
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})

// Get students for registration
export async function getRegistrationStudents() {
  try {
    const ip = headers().get('x-forwarded-for') ?? '127.0.0.1'
    const { success, reset } = await ratelimit.limit(ip)

    // Log rate limit event
    await monitoring.logRateLimit({
      ip,
      endpoint: 'getRegistrationStudents',
      success,
      timestamp: Date.now(),
      resetTime: reset,
    })

    if (!success) {
      throw new Error('Too many requests. Please try again in a few seconds.')
    }

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
    const ip = headers().get('x-forwarded-for') ?? '127.0.0.1'
    const { success, reset } = await ratelimit.limit(ip)

    if (!success) {
      throw new Error(
        `Too many updates. Please wait ${Math.ceil(
          (reset - Date.now()) / 1000
        )} seconds.`
      )
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

    if (!student.siblingGroupId && !sibling.siblingGroupId) {
      await prisma.sibling.create({
        data: { students: { connect: [{ id: studentId }, { id: siblingId }] } },
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
  try {
    return await prisma.student.findUnique({
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
        siblingGroup: {
          select: {
            students: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch student:', error)
    throw new Error('Failed to fetch student')
  }
}
