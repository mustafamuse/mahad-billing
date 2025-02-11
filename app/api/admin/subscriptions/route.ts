import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get all subscriptions with their associated students and payers
    const subscriptions = await prisma.subscription.findMany({
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    // Transform the data to return only what we need
    const students = subscriptions.flatMap((subscription) =>
      subscription.payer.students.map((student) => ({
        id: student.id,
        name: student.name,
        payerName: subscription.payer.name,
        payerEmail: subscription.payer.email,
        payerPhone: subscription.payer.phone,
        monthlyAmount: student.monthlyRate,
        nextPaymentDate: subscription.currentPeriodEnd,
        status: subscription.status,
      }))
    )

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
