'use server'

import { cache } from 'react'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { StudentStatus } from '@/lib/types/student'

// Use string literal for subscription status
const SUBSCRIPTION_STATUS_ACTIVE = 'ACTIVE' as const

// Define the exact Prisma return type we need
type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    batch: {
      select: {
        id: true
        name: true
      }
    }
    siblingGroup: {
      select: {
        id: true
        students: {
          select: {
            id: true
            name: true
            monthlyRate: true
          }
        }
      }
    }
    payer: {
      include: {
        subscriptions: {
          where: {
            status: { equals: 'ACTIVE' }
          }
          select: {
            id: true
            status: true
            currentPeriodEnd: true
            gracePeriodEndsAt: true
            paymentRetryCount: true
          }
        }
      }
    }
  }
}>

// Our DTO for the frontend
export interface StudentDTO {
  id: string
  name: string
  monthlyRate: number
  hasCustomRate: boolean
  status: StudentStatus
  payorId: string | null
  siblingGroupId: string | null
  batchId: string | null
  batchName: string | null
  // Computed fields
  isEligibleForAutopay: boolean
  hasActiveSubscription: boolean
  familyDiscount: {
    applied: boolean
    amount: number
    siblingCount: number
  }
}

interface StudentQueryOptions {
  includeInactive?: boolean
  includeBatchInfo?: boolean
  siblingGroupId?: string
}

// Async mapper function for server components
async function mapToDTO(student: StudentWithRelations): Promise<StudentDTO> {
  const siblingCount = student.siblingGroup?.students.length ?? 0
  const hasActiveSubscription = (student.payer?.subscriptions.length ?? 0) > 0
  const familyDiscountAmount = siblingCount > 1 ? student.monthlyRate * 0.1 : 0

  return {
    id: student.id,
    name: student.name,
    monthlyRate: student.monthlyRate,
    hasCustomRate: student.customRate,
    status: student.status as StudentStatus,
    payorId: student.payerId,
    siblingGroupId: student.siblingGroupId,
    batchId: student.batch?.id ?? null,
    batchName: student.batch?.name ?? null,
    // Computed fields
    isEligibleForAutopay: !hasActiveSubscription,
    hasActiveSubscription,
    familyDiscount: {
      applied: siblingCount > 1,
      amount: familyDiscountAmount,
      siblingCount,
    },
  }
}

// Main query function
export const getStudents = cache(async (options: StudentQueryOptions = {}) => {
  console.log('🔍 Calling getStudents with options:', options)

  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { payer: null },
          {
            payer: {
              subscriptions: {
                none: {
                  status: SUBSCRIPTION_STATUS_ACTIVE,
                  AND: {
                    currentPeriodEnd: {
                      gt: new Date(),
                    },
                  },
                },
              },
            },
          },
        ],
        status: options.includeInactive ? undefined : StudentStatus.REGISTERED,
        ...(options.siblingGroupId && {
          siblingGroupId: options.siblingGroupId,
        }),
      },
      include: {
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
        siblingGroup: {
          select: {
            id: true,
            students: {
              select: {
                id: true,
                name: true,
                monthlyRate: true,
              },
            },
          },
        },
        payer: {
          include: {
            subscriptions: {
              where: {
                status: SUBSCRIPTION_STATUS_ACTIVE,
              },
              select: {
                id: true,
                status: true,
                currentPeriodEnd: true,
                gracePeriodEndsAt: true,
                paymentRetryCount: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Map all students to DTOs
    return await Promise.all(students.map(mapToDTO))
  } catch (error) {
    console.error('Error fetching students:', error)
    throw error
  }
})

// Helper functions
export async function getEligibleStudentsForAutopay() {
  return getStudents({
    includeInactive: false,
    includeBatchInfo: true,
  })
}

export async function getSiblings(siblingGroupId: string) {
  return getStudents({
    siblingGroupId,
    includeBatchInfo: true,
  })
}
