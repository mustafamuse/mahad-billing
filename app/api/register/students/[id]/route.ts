import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const data = await req.json()

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify student exists and is in Irshād 4 batch
      const student = await tx.student.findFirst({
        where: {
          id,
          batch: {
            name: 'Irshād 4',
          },
        },
        include: {
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
      })

      if (!student) {
        throw new Error('Student not found in Irshād 4 batch')
      }

      console.log('Raw date data received:', data.dateOfBirth)

      const dateOfBirth =
        data.dateOfBirth && data.dateOfBirth.year
          ? new Date(
              `${data.dateOfBirth.year}-${String(data.dateOfBirth.month).padStart(2, '0')}-${String(data.dateOfBirth.day).padStart(2, '0')}`
            )
          : undefined

      console.log('Processed date:', dateOfBirth)

      // 2. Update student information
      const updatedStudent = await tx.student.update({
        where: { id },
        data: {
          email: data.email,
          phone: data.phone,
          schoolName: data.schoolName,
          educationLevel: data.educationLevel,
          gradeLevel: data.gradeLevel,
          dateOfBirth,
        },
        include: {
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
      })

      // 3. Handle sibling group changes if hasSiblings value changed
      if (data.hasSiblings === false && student.siblingGroup) {
        // Remove student from sibling group
        await tx.student.update({
          where: { id },
          data: { siblingGroupId: null },
        })

        // If only 2 students in group, delete the entire group
        if (student.siblingGroup.students.length <= 2) {
          await tx.sibling.delete({
            where: { id: student.siblingGroup.id },
          })
        }
      }

      return updatedStudent
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update student:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to update student'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
