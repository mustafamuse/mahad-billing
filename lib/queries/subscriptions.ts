import { SubscriptionStatus } from '@prisma/client'

import { PAYMENT_RULES, getGracePeriodEnd } from '@/lib/config/payment-rules'
import { prisma } from '@/lib/db'
import { BASE_RATE } from '@/lib/types'
import { StudentStatus } from '@/lib/types/student'

// Constants for grace period settings
export const GRACE_PERIOD_DAYS = 5
export const MAX_PAYMENT_RETRIES = 3

export interface StudentSubscriptionInfo {
  isSubscribed: boolean
  status: SubscriptionStatus | null
  subscription: {
    id: string
    stripeSubscriptionId: string
    status: SubscriptionStatus
    lastPaymentDate: Date | null
    nextPaymentDate: Date | null
    currentPeriodStart: Date | null
    currentPeriodEnd: Date | null
  } | null
  payer: {
    id: string
    name: string
    email: string
  } | null
}

/**
 * Get subscription status and details for a student
 */
export async function getStudentSubscriptionStatus(
  studentId: string
): Promise<StudentSubscriptionInfo> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      payer: {
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!student?.payer?.subscriptions?.length) {
    return {
      isSubscribed: false,
      status: null,
      subscription: null,
      payer: null,
    }
  }

  const [latestSubscription] = student.payer.subscriptions

  return {
    isSubscribed: latestSubscription.status === SubscriptionStatus.ACTIVE,
    status: latestSubscription.status,
    subscription: latestSubscription,
    payer: {
      id: student.payer.id,
      name: student.payer.name,
      email: student.payer.email,
    },
  }
}

/**
 * Get all active subscriptions for a payer
 */
export async function getPayerActiveSubscriptions(payerId: string) {
  return prisma.subscription.findMany({
    where: {
      payerId,
      status: SubscriptionStatus.ACTIVE,
    },
    include: {
      payer: {
        include: {
          students: true,
        },
      },
    },
  })
}

/**
 * Calculate grace period end date
 */
function _calculateGracePeriodEnd(failureDate: Date): Date {
  // Use business days for initial warning and return final grace period end date
  return getGracePeriodEnd(failureDate)
}

/**
 * Update subscription and student statuses atomically
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
  options?: {
    cancelReason?: string
    lastPaymentDate?: Date
    nextPaymentDate?: Date
    lastPaymentError?: string
  }
) {
  return prisma.$transaction(async (tx) => {
    // 1. Update subscription
    const subscription = await tx.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: newStatus,
        lastPaymentDate: options?.lastPaymentDate,
        nextPaymentDate: options?.nextPaymentDate,
        lastPaymentError: options?.lastPaymentError,
        gracePeriodEndsAt:
          newStatus === SubscriptionStatus.PAST_DUE
            ? getGracePeriodEnd(new Date())
            : null,
      },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    // 2. Update student statuses based on subscription status
    if (subscription.payer?.students) {
      const newStudentStatus = getNewStudentStatus(newStatus)
      await tx.student.updateMany({
        where: {
          payerId: subscription.payerId,
        },
        data: {
          status: newStudentStatus,
          lastPaymentDate: options?.lastPaymentDate,
          nextPaymentDue: options?.nextPaymentDate,
        },
      })
    }

    return subscription
  })
}

// Helper function to map subscription status to student status
function getNewStudentStatus(
  subscriptionStatus: SubscriptionStatus
): StudentStatus {
  switch (subscriptionStatus) {
    case SubscriptionStatus.ACTIVE:
      return StudentStatus.ENROLLED
    case SubscriptionStatus.CANCELED:
    case SubscriptionStatus.INACTIVE:
      return StudentStatus.WITHDRAWN
    case SubscriptionStatus.PAST_DUE:
      return StudentStatus.ENROLLED // Keep as enrolled during grace period
    default:
      return StudentStatus.REGISTERED
  }
}

/**
 * Handle past due subscriptions that exceed grace period
 */
export async function processPastDueSubscriptions() {
  const pastDueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndsAt: {
        lt: new Date(),
      },
      paymentRetryCount: {
        gte: PAYMENT_RULES.RETRY.MAX_ATTEMPTS,
      },
    },
  })

  for (const subscription of pastDueSubscriptions) {
    await updateSubscriptionStatus(
      subscription.stripeSubscriptionId,
      SubscriptionStatus.CANCELED,
      {
        cancelReason:
          'Payment failed after maximum retries and grace period expired',
      }
    )
  }
}

/**
 * Validate if a student can be enrolled
 */
export async function validateStudentForEnrollment(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      siblingGroup: {
        include: {
          students: {
            select: {
              id: true,
              name: true,
              monthlyRate: true,
              customRate: true,
            },
          },
        },
      },
      payer: {
        include: {
          subscriptions: {
            where: {
              status: {
                in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE],
              },
            },
          },
        },
      },
    },
  })

  if (!student) {
    throw new Error('Student not found')
  }

  // Only allow enrollment for students with REGISTERED status
  if (student.status !== StudentStatus.REGISTERED) {
    throw new Error(
      `Student cannot be enrolled (current status: ${student.status})`
    )
  }

  // Check if student already has an active subscription
  if (
    student.payer?.subscriptions?.length &&
    student.payer.subscriptions.length > 0
  ) {
    throw new Error('Student already has an active subscription')
  }

  // Calculate discount based on siblings
  const siblingCount = student.siblingGroup?.students.length ?? 0
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
    student: {
      ...student,
      monthlyRate: calculatedRate,
      hasCustomRate: student.customRate,
      discountApplied: discount,
      familyId: student.siblingGroupId,
    },
  }
}
