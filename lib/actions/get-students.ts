'use server'

import { Prisma, SubscriptionStatus } from '@prisma/client'

import { prisma } from '@/lib/db'
import { Student } from '@/lib/types'

export async function getStudents(): Promise<Student[]> {
  console.log('🔍 Calling getStudents()...')
  try {
    const students = await prisma.student.findMany({
      include: {
        familyGroup: true,
        classGroups: true,
        payor: {
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
            payor: {
              include: {
                subscriptions: true
              }
            }
          }
        }>
      ) => {
        // Calculate status based on payor and subscription data
        let status: 'available' | 'registered' | 'enrolled' = 'available'

        if (student.payor) {
          // If student has a payor
          status = 'registered'

          // If payor has any active subscriptions
          if (student.payor.subscriptions.length > 0) {
            status = 'enrolled'
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
          payorId: student.payorId,
        }
      }
    )
  } catch (error) {
    console.error('Error fetching students:', error)
    throw error
  }
}
