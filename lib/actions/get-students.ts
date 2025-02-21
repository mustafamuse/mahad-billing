'use server'

import { cache } from 'react'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { BASE_RATE } from '@/lib/types'
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
  email: string | null
  phone: string | null
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

  // Calculate tiered discount based on number of siblings
  let discount = 0
  if (!student.customRate && siblingCount > 1) {
    // Tiered discount calculation:
    // 2 siblings → $10 off each ($140 per student)
    // 3 siblings → $15 off each ($135 per student)
    // 4 siblings → $20 off each ($130 per student)
    discount = (siblingCount - 1) * 5 + 5
  }

  // Use custom rate if set, otherwise apply BASE_RATE with discount
  const calculatedRate = student.customRate
    ? student.monthlyRate
    : BASE_RATE - discount

  return {
    id: student.id,
    name: student.name,
    monthlyRate: calculatedRate,
    hasCustomRate: student.customRate,
    status: student.status as StudentStatus,
    payorId: student.payerId,
    siblingGroupId: student.siblingGroupId,
    batchId: student.batch?.id ?? null,
    batchName: student.batch?.name ?? null,
    email: student.email,
    phone: student.phone,
    // Computed fields
    isEligibleForAutopay: !hasActiveSubscription,
    hasActiveSubscription,
    familyDiscount: {
      applied: siblingCount > 1 && !student.customRate,
      amount: discount,
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
