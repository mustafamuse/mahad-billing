import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

// GET /api/admin/students/[id]/payments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    // Get all payments for this student
    const payments = await prisma.studentPayment.findMany({
      where: { studentId: id },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      select: {
        id: true,
        year: true,
        month: true,
        amountPaid: true,
        paidAt: true,
      },
    })
    return NextResponse.json(payments)
  } catch (error) {
    console.error('Failed to fetch student payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student payments' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
