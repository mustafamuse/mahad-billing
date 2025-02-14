'use server'

import { EducationLevel, GradeLevel, SubscriptionStatus } from '@prisma/client'

import { prisma } from '@/lib/db'

import { StudentStatus } from '../types/student'

export interface RegisterStudent {
  id: string
  name: string
  email: string | null
  phone: string | null
  schoolName: string | null
  educationLevel: EducationLevel | null
  gradeLevel: GradeLevel | null
  dateOfBirth: string | null
  siblingGroup: {
    students: {
      id: string
      name: string
    }[]
  } | null
}

export async function getStudents(): Promise<RegisterStudent[]> {
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
        siblingGroup: {
          include: {
            students: true,
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
      email: student.email,
      phone: student.phone,
      schoolName: student.schoolName,
      educationLevel: student.educationLevel,
      gradeLevel: student.gradeLevel,
      dateOfBirth: student.dateOfBirth?.toISOString() || null,
      batch: student.batchId,
      monthlyRate: student.monthlyRate,
      hasCustomRate: student.customRate,
      subscription: (student.payer?.subscriptions?.length ?? 0) > 0,
      status: student.status as StudentStatus,
      payorId: student.payerId,
      siblingGroup: student.siblingGroup
        ? {
            students: student.siblingGroup.students.map((s) => ({
              id: s.id,
              name: s.name,
            })),
          }
        : null,
    }))
  } catch (error) {
    console.error('Error fetching students:', error)
    throw error
  }
}
