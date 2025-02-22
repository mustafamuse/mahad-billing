import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const backup = await request.json()

    // Start transaction to ensure all-or-nothing restore
    await prisma.$transaction(async (tx) => {
      // Clear existing data (optional, based on your needs)
      await tx.subscription.deleteMany({})
      await tx.student.deleteMany({})
      await tx.sibling.deleteMany({})
      await tx.payer.deleteMany({})
      await tx.batch.deleteMany({})

      // Restore in correct order (handle relationships)
      // 1. First, create batches (no dependencies)
      await tx.batch.createMany({
        data: backup.data.batches.map(
          ({ id, name, startDate, endDate }: any) => ({
            id,
            name,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
          })
        ),
      })

      // 2. Create sibling groups
      await tx.sibling.createMany({
        data: backup.data.siblings.map(({ id }: any) => ({ id })),
      })

      // 3. Create payers
      await tx.payer.createMany({
        data: backup.data.payers.map(
          ({
            id,
            name,
            email,
            phone,
            stripeCustomerId,
            relationship,
            isActive,
          }: any) => ({
            id,
            name,
            email,
            phone,
            stripeCustomerId,
            relationship,
            isActive,
          })
        ),
      })

      // 4. Create students (with relationships)
      await tx.student.createMany({
        data: backup.data.students.map((student: any) => ({
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          dateOfBirth: student.dateOfBirth
            ? new Date(student.dateOfBirth)
            : null,
          educationLevel: student.educationLevel,
          gradeLevel: student.gradeLevel,
          schoolName: student.schoolName,
          highSchoolGraduated: student.highSchoolGraduated,
          highSchoolGradYear: student.highSchoolGradYear,
          collegeGraduated: student.collegeGraduated,
          collegeGradYear: student.collegeGradYear,
          postGradCompleted: student.postGradCompleted,
          postGradYear: student.postGradYear,
          batchId: student.batchId,
          monthlyRate: student.monthlyRate,
          customRate: student.customRate,
          status: student.status,
          payerId: student.payerId,
          siblingGroupId: student.siblingGroupId,
          lastPaymentDate: student.lastPaymentDate
            ? new Date(student.lastPaymentDate)
            : null,
          nextPaymentDue: student.nextPaymentDue
            ? new Date(student.nextPaymentDue)
            : null,
        })),
      })

      // 5. Finally, restore subscriptions
      await tx.subscription.createMany({
        data: backup.data.subscriptions.map((sub: any) => ({
          id: sub.id,
          stripeSubscriptionId: sub.stripeSubscriptionId,
          payerId: sub.payerId,
          status: sub.status,
          lastPaymentDate: sub.lastPaymentDate
            ? new Date(sub.lastPaymentDate)
            : null,
          nextPaymentDate: sub.nextPaymentDate
            ? new Date(sub.nextPaymentDate)
            : null,
          currentPeriodStart: sub.currentPeriodStart
            ? new Date(sub.currentPeriodStart)
            : null,
          currentPeriodEnd: sub.currentPeriodEnd
            ? new Date(sub.currentPeriodEnd)
            : null,
          paymentRetryCount: sub.paymentRetryCount,
          lastPaymentError: sub.lastPaymentError,
          gracePeriodEndsAt: sub.gracePeriodEndsAt
            ? new Date(sub.gracePeriodEndsAt)
            : null,
        })),
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Database restored successfully',
    })
  } catch (error) {
    console.error('Restore failed:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to restore database',
      },
      { status: 500 }
    )
  }
}
