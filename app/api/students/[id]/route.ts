import { NextRequest, NextResponse } from 'next/server'

import { z } from 'zod'

import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate the student ID
    const studentId = z.string().uuid().parse(params.id)

    // Fetch the student from the database
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Return the student information
    return NextResponse.json({
      id: student.id,
      name: student.name,
    })
  } catch (error) {
    console.error('Error fetching student:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid student ID format' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch student information' },
      { status: 500 }
    )
  }
}
