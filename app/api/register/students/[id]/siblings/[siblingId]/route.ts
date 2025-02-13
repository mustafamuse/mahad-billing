import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; siblingId: string } }
) {
  try {
    const { id, siblingId } = params

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Verify both students exist and are in Irshād 4 batch
      const [student, sibling] = await Promise.all([
        tx.student.findFirst({
          where: {
            id,
            batch: {
              name: 'Irshād 4',
            },
          },
          include: {
            siblingGroup: {
              include: {
                students: true,
              },
            },
          },
        }),
        tx.student.findFirst({
          where: {
            id: siblingId,
            batch: {
              name: 'Irshād 4',
            },
          },
        }),
      ])

      if (!student || !sibling) {
        throw new Error('One or both students not found in Irshād 4 batch')
      }

      if (!student.siblingGroup) {
        throw new Error('Students are not in a sibling group')
      }

      // If only 2 students in group, remove the group entirely
      if (student.siblingGroup.students.length <= 2) {
        // First update all students to remove their siblingGroupId
        await tx.student.updateMany({
          where: {
            siblingGroupId: student.siblingGroup.id,
          },
          data: {
            siblingGroupId: null,
          },
        })

        // Then delete the sibling group
        await tx.sibling.delete({
          where: {
            id: student.siblingGroup.id,
          },
        })
      } else {
        // Just remove the sibling from the group
        await tx.student.update({
          where: {
            id: siblingId,
          },
          data: {
            siblingGroupId: null,
          },
        })
      }

      // Return the updated student for the response
      return await tx.student.findFirst({
        where: { id: student.id },
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
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to remove sibling:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to remove sibling'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
