'use server'

import { SubscriptionStatus } from '@prisma/client'

import { prisma } from '@/lib/db'
import { Student } from '@/lib/types'

import { StudentStatus } from '../types/student'

export async function getStudents(): Promise<Student[]> {
  console.log('🔍 Calling getStudents()...')
  try {
    const hasNoActiveSubscription = {
      payer: {
        subscriptions: {
          none: {
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
    }

    const students = await prisma.student.findMany({
      where: {
        OR: [{ payer: null }, hasNoActiveSubscription],
      },
      include: {
        batch: true,
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

    return students.map((student) => ({
      id: student.id,
      name: student.name,
      batch: student.batchId,
      monthlyRate: student.monthlyRate,
      hasCustomRate: student.customRate,
      subscription: (student.payer?.subscriptions?.length ?? 0) > 0,
      status: student.status as StudentStatus,
      payorId: student.payerId,
      siblingId: student.siblingGroupId,
    }))
  } catch (error) {
    console.error('Error fetching students:', error)
    throw error
  }
}
