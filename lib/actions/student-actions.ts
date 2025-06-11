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
      subscription: student.stripeSubscriptionId
        ? {
            id: student.stripeSubscriptionId,
            status: student.subscriptionStatus || 'unknown',
            isActive: student.subscriptionStatus === 'active',
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
    },
  })

  if (!student) {
    throw new Error('Student not found')
  }

  return {
    hasSiblings: (student.siblingGroup?.students?.length ?? 0) > 1,
    isOnlyStudentForPayer: false, // No longer relevant with simplified schema
    hasActiveSubscription: student.subscriptionStatus === 'active',
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      siblingGroup: {
        include: { students: true },
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

    // 2. Handle active subscription
    if (student.subscriptionStatus === 'active') {
      // Mark as withdrawn instead of deleting if they have an active subscription
      await tx.student.update({
        where: { id: studentId },
        data: {
          status: 'withdrawn',
          subscriptionStatus: 'canceled', // Mark subscription as canceled
        },
      })

      // Note: Actual Stripe subscription cancellation should be handled elsewhere
      console.log(
        `Student ${studentId} has active subscription. Marked as withdrawn but not deleted.`
      )
      return
    }

    // 3. Delete student payments first (cascade should handle this but being explicit)
    await tx.studentPayment.deleteMany({
      where: { studentId },
    })

    // 4. Delete the student
    await tx.student.delete({
      where: { id: studentId },
    })
  })
}
