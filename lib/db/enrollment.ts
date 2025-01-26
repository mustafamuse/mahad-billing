import { PrismaClient, Prisma } from '@prisma/client'

import { handlePrismaError } from '@/lib/errors'

const prisma = new PrismaClient()

interface EnrollmentData {
  email: string
  firstName: string
  lastName: string
  phone: string
  relationship: string
  studentIds: string[] // Changed to just IDs instead of full student objects
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
    // We don't throw here as this is already in an error handler
  }
}

export async function createEnrollment(data: EnrollmentData) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the payor record with the provided information
      const payor = await tx.payor.create({
        data: {
          name: `${data.firstName} ${data.lastName}`,
          stripeCustomerId: data.stripeCustomerId,
          relationship: data.relationship,
        },
      })

      // 2. Update the existing students to link them to this payor
      await tx.student.updateMany({
        where: {
          id: {
            in: data.studentIds,
          },
        },
        data: {
          payorId: payor.id,
        },
      })

      // 3. Return the created records
      const updatedStudents = await tx.student.findMany({
        where: {
          id: {
            in: data.studentIds,
          },
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
