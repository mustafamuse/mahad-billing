import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

// POST /api/admin/students/[id]/manual-payment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    const body = await request.json()
    const { month, year, amount, applyToSubscriptionMembers } = body

    // Validate input
    if (!month || !year || !amount) {
      return NextResponse.json(
        { error: 'Month, year, and amount are required' },
        { status: 400 }
      )
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        stripeSubscriptionId: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get students to apply payment to
    let studentsToUpdate = [student]

    if (applyToSubscriptionMembers && student.stripeSubscriptionId) {
      // Find all students with the same subscription
      const subscriptionMembers = await prisma.student.findMany({
        where: {
          stripeSubscriptionId: student.stripeSubscriptionId,
        },
        select: { id: true, name: true, stripeSubscriptionId: true },
      })
      studentsToUpdate = subscriptionMembers
    }

    // Create payment date for first day of month at 12 PM
    const paymentDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      1,
      12,
      0,
      0
    )

    // Create payment records
    const paymentData = studentsToUpdate.map((s) => ({
      studentId: s.id,
      year: parseInt(year),
      month: parseInt(month),
      amountPaid: Math.round(parseFloat(amount) * 100), // Convert to cents
      paidAt: paymentDate,
      stripeInvoiceId: null, // Zelle payments don't have Stripe invoice IDs
    }))

    // Check for existing payments to avoid duplicates
    const existingPayments = await prisma.studentPayment.findMany({
      where: {
        studentId: { in: studentsToUpdate.map((s) => s.id) },
        year: parseInt(year),
        month: parseInt(month),
      },
    })

    if (existingPayments.length > 0) {
      return NextResponse.json(
        { error: 'Payment already exists for this month' },
        { status: 400 }
      )
    }

    // Create the payments
    const createdPayments = await prisma.studentPayment.createMany({
      data: paymentData,
    })

    return NextResponse.json({
      success: true,
      message: `Created ${createdPayments.count} payment record(s)`,
      studentsUpdated: studentsToUpdate.map((s) => s.name),
    })
  } catch (error) {
    console.error('Failed to create manual payment:', error)
    return NextResponse.json(
      { error: 'Failed to create manual payment' },
      { status: 500 }
    )
  }
}
