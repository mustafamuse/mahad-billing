import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Find the Irshād 4 batch
    const batch = await prisma.batch.findFirst({
      where: { name: 'Irshād 4' },
    })

    if (!batch) {
      return NextResponse.json(
        { error: 'Irshād 4 batch not found' },
        { status: 404 }
      )
    }

    // Get all students in this batch with their sibling information
    const students = await prisma.student.findMany({
      where: {
        batchId: batch.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        educationLevel: true,
        gradeLevel: true,
        schoolName: true,
        siblingGroup: {
          include: {
            students: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Failed to fetch students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
