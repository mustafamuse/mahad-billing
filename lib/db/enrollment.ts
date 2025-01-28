import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { handlePrismaError } from '@/lib/errors'

interface EnrollmentData {
  email: string
  firstName: string
  lastName: string
  phone: string
  relationship: string
  studentIds: string[]
  stripeCustomerId: string
}

// Cleanup function to remove created records if SetupIntent fails
export async function cleanupEnrollmentRecords(payorId: string) {
  console.log('🧹 Starting cleanup of enrollment records...')

  try {
    await prisma.$transaction([
      prisma.student.updateMany({
        where: { payorId },
        data: { payorId: null },
      }),
      prisma.payor.delete({
        where: { id: payorId },
      }),
    ])

    console.log('✅ Cleanup completed successfully')
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

export async function createEnrollment(data: EnrollmentData) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify all students exist and are available
      const students = await tx.student.findMany({
        where: {
          id: { in: data.studentIds },
          payorId: null, // Double check they're still available
        },
        include: { familyGroup: true },
      })

      if (students.length !== data.studentIds.length) {
        throw new Error(
          'One or more selected students are no longer available for enrollment'
        )
      }

      // 2. For multiple students, verify family relationship
      if (students.length > 1) {
        const familyIds = new Set(
          students.map((s) => s.familyId).filter(Boolean)
        )
        if (familyIds.size > 1) {
          throw new Error('All students must belong to the same family group')
        }
      }

      // 3. Create the payor record
      const payor = await tx.payor.create({
        data: {
          name: `${data.firstName} ${data.lastName}`,
          stripeCustomerId: data.stripeCustomerId,
          relationship: data.relationship,
          students: {
            connect: data.studentIds.map((id) => ({ id })),
          },
        },
      })

      // 4. Return the updated records
      const updatedStudents = await tx.student.findMany({
        where: {
          id: { in: data.studentIds },
        },
        include: {
          familyGroup: true,
        },
      })

      return {
        payor,
        students: updatedStudents,
      }
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw handlePrismaError(error)
    }
    throw error
  }
}
