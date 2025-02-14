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
        prisma.sibling.delete({ where: { id: sibling.siblingGroupId } }),
      ])
    }

    // Always return updated student
    const updatedStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        siblingGroup: {
          select: {
            students: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

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
        siblingGroup: {
          select: {
            students: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return { success: true, student: updatedStudent }
  } catch (error) {
    console.error('Failed to remove sibling:', error)
    throw new Error('Failed to remove sibling')
  }
}
