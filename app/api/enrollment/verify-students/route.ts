import { NextResponse } from 'next/server'

import { z } from 'zod'

import { prisma } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'

const verifyStudentsSchema = z.object({
  studentIds: z
    .array(z.string().uuid())
    .min(1, 'At least one student required'),
  familyId: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  try {
    // 1. Parse and validate request body
    const body = await req.json()
    const { studentIds, familyId } = verifyStudentsSchema.parse(body)

    // 2. Start a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 3. Get students with their current status
      const students = await tx.student.findMany({
        where: {
          id: { in: studentIds },
        },
        select: {
          id: true,
          name: true,
          payorId: true,
          familyId: true,
        },
      })

      // 4. Check if all requested students were found
      if (students.length !== studentIds.length) {
        throw new AppError(
          'One or more students not found',
          'STUDENTS_NOT_FOUND',
          404
        )
      }

      // 5. Check availability and family group consistency
      const unavailableStudents = students.filter((s) => s.payorId !== null)
      const differentFamilyStudents = familyId
        ? students.filter((s) => s.familyId && s.familyId !== familyId)
        : []

      if (
        unavailableStudents.length > 0 ||
        differentFamilyStudents.length > 0
      ) {
        return {
          available: false,
          unavailableStudents: unavailableStudents.map((s) => ({
            id: s.id,
            name: s.name,
            reason: 'already_enrolled',
          })),
          differentFamilyStudents: differentFamilyStudents.map((s) => ({
            id: s.id,
            name: s.name,
            reason: 'different_family',
          })),
        }
      }

      // 6. All students are available
      return {
        available: true,
        students: students.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Student verification failed:', error)

    if (error instanceof z.ZodError) {
      const validationError = new ValidationError('Invalid student data')
      return NextResponse.json(
        {
          success: false,
          code: validationError.code,
          errors: error.errors,
        },
        { status: validationError.statusCode }
      )
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
        },
        { status: error.statusCode }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify students',
      },
      { status: 500 }
    )
  }
}
