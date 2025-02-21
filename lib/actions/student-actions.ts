'use server'

import { prisma } from '@/lib/db'
import type { StudentDetails, DeleteWarnings } from '@/lib/types/student'

export async function getStudentDetails(
  searchTerm: string
): Promise<StudentDetails> {
  // Clean up phone number search term
  const cleanedSearchTerm = searchTerm.replace(/[-\s]/g, '')

  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        // Clean up stored phone numbers for comparison
        { phone: { contains: cleanedSearchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      batch: true,
      payer: {
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
          },
          students: true,
        },
      },
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

  if (!student) {
    throw new Error('Student not found')
  }

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email || undefined,
      phone: student.phone || undefined,
      status: student.status,
      monthlyRate: student.monthlyRate,
      customRate: student.customRate,
      educationLevel: student.educationLevel || undefined,
      gradeLevel: student.gradeLevel || undefined,
      schoolName: student.schoolName || undefined,
    },
    associations: {
      batch: student.batch
        ? {
            id: student.batch.id,
            name: student.batch.name,
          }
        : undefined,
      payer: student.payer
        ? {
            id: student.payer.id,
            name: student.payer.name,
            email: student.payer.email,
            activeSubscriptions: student.payer.subscriptions.length,
            totalStudents: student.payer.students.length,
          }
        : undefined,
      siblingGroup: student.siblingGroup
        ? {
            id: student.siblingGroup.id,
            students: student.siblingGroup.students,
          }
        : undefined,
    },
  }
}

export async function getStudentWarnings(
  studentId: string
): Promise<DeleteWarnings> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      siblingGroup: {
        include: { students: true },
      },
      payer: {
        include: {
          students: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
  })

  if (!student) {
    throw new Error('Student not found')
  }

  return {
    hasSiblings: (student.siblingGroup?.students?.length ?? 0) > 1,
    isOnlyStudentForPayer: (student.payer?.students?.length ?? 0) === 1,
    hasActiveSubscription: (student.payer?.subscriptions?.length ?? 0) > 0,
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      siblingGroup: {
        include: { students: true },
      },
      payer: {
        include: {
          students: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
  })

  if (!student) {
    throw new Error('Student not found')
  }

  await prisma.$transaction(async (tx) => {
    // 1. Handle sibling group
    if (student.siblingGroup) {
      const remainingStudents = student.siblingGroup.students.length - 1
      if (remainingStudents <= 1) {
        await tx.sibling.delete({
          where: { id: student.siblingGroup.id },
        })
      }
    }
    // 2. Handle student status
    if ((student.payer?.subscriptions?.length ?? 0) > 0) {
      // If payer has active subscriptions and other students
      const otherActiveStudents =
        student.payer?.students?.filter(
          (s) => s.id !== studentId && s.status === 'enrolled'
        )?.length ?? 0

      if (otherActiveStudents > 0) {
        // Just mark this student as withdrawn, keep subscriptions active
        await tx.student.update({
          where: { id: studentId },
          data: { status: 'withdrawn' },
        })
      }
    }

    // 3. Delete the student
    await tx.student.delete({
      where: { id: studentId },
    })

    // 4. Update payer if no students left
    if (student.payer && student.payer.students.length === 1) {
      await tx.payer.update({
        where: { id: student.payer.id },
        data: { isActive: false },
      })
    }
  })
}
