import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

// Get a single student by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: {
        id: params.id,
      },
      include: {
        batch: true,
        payer: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Failed to fetch student:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    )
  }
}

// Update a student
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Validate the student exists
    const existingStudent = await prisma.student.findUnique({
      where: {
        id: params.id,
      },
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Update the student
    const updatedStudent = await prisma.student.update({
      where: {
        id: params.id,
      },
      data: body,
      include: {
        batch: true,
        payer: true,
      },
    })

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error('Failed to update student:', error)
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    )
  }
}

// Delete a student
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate the student exists
    const existingStudent = await prisma.student.findUnique({
      where: {
        id: params.id,
      },
    })

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Delete the student
    await prisma.student.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete student:', error)
    return NextResponse.json(
      { error: 'Failed to delete student' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
