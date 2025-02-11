'use server'

import { Prisma, SubscriptionStatus } from '@prisma/client'

import { prisma } from '@/lib/db'
import { Student } from '@/lib/types'
import { StudentStatus } from '@/lib/types/student'

export async function getStudents(): Promise<Student[]> {
  console.log('🔍 Calling getStudents()...')
  try {
    const students = await prisma.student.findMany({
      include: {
        familyGroup: true,
        classGroups: true,
        payer: {
          include: {
            subscriptions: {
              where: {
                status: SubscriptionStatus.ACTIVE,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return students.map(
      (
        student: Prisma.StudentGetPayload<{
          include: {
            familyGroup: true
            classGroups: true
            payer: {
              include: {
                subscriptions: true
              }
            }
          }
        }>
      ) => {
        // Calculate status based on payer and subscription data
        let status: StudentStatus = StudentStatus.REGISTERED

        if (student.payer) {
          // If student has a payer and active subscriptions
          if (student.payer.subscriptions.length > 0) {
            status = StudentStatus.ENROLLED
          }
        }

        return {
          id: student.id,
          name: student.name,
          className: student.className,
          monthlyRate: student.monthlyRate,
          hasCustomRate: student.customRate,
          familyId: student.familyId,
          familyName: student.name.split(' ').slice(-1)[0],
          siblings: 0,
          totalFamilyMembers: 0,
          status,
          payorId: student.payerId,
        }
      }
    )
  } catch (error) {
    console.error('Error fetching students:', error)
    throw error
  }
}
