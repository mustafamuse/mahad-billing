import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

// Get a single sibling group by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const siblingGroup = await prisma.sibling.findUnique({
      where: {
        id: params.id,
      },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            batchId: true,
            batch: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    })

    if (!siblingGroup) {
      return NextResponse.json(
        { error: 'Sibling group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(siblingGroup)
  } catch (error) {
    console.error('Failed to fetch sibling group:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sibling group' },
      { status: 500 }
    )
  }
}

// Update a sibling group (add or remove students)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { addStudentIds, removeStudentIds } = body

    // Validate the sibling group exists
    const existingSiblingGroup = await prisma.sibling.findUnique({
      where: {
        id: params.id,
      },
      include: {
        students: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!existingSiblingGroup) {
      return NextResponse.json(
        { error: 'Sibling group not found' },
        { status: 404 }
      )
    }

    // Prepare the update data
    const updateData: any = {}

    // Add students to the group
    if (
      addStudentIds &&
      Array.isArray(addStudentIds) &&
      addStudentIds.length > 0
    ) {
      updateData.students = {
        connect: addStudentIds.map((id) => ({ id })),
      }
    }

    // Remove students from the group
    if (
      removeStudentIds &&
      Array.isArray(removeStudentIds) &&
      removeStudentIds.length > 0
    ) {
      if (!updateData.students) {
        updateData.students = {}
      }
      updateData.students.disconnect = removeStudentIds.map((id) => ({ id }))
    }

    // Update the sibling group
    const updatedSiblingGroup = await prisma.sibling.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            batchId: true,
            batch: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    })

    // If there are no students left in the group, delete it
    if (updatedSiblingGroup.students.length < 2) {
      // If only one student left, remove them from the group
      if (updatedSiblingGroup.students.length === 1) {
        await prisma.student.update({
          where: {
            id: updatedSiblingGroup.students[0].id,
          },
          data: {
            siblingGroupId: null,
          },
        })
      }

      // Delete the empty sibling group
      await prisma.sibling.delete({
        where: {
          id: params.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Sibling group deleted because it had fewer than 2 students',
        deleted: true,
      })
    }

    return NextResponse.json({
      success: true,
      siblingGroup: updatedSiblingGroup,
    })
  } catch (error) {
    console.error('Failed to update sibling group:', error)
    return NextResponse.json(
      { error: 'Failed to update sibling group' },
      { status: 500 }
    )
  }
}

// Delete a sibling group
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Validate the sibling group exists
    const existingSiblingGroup = await prisma.sibling.findUnique({
      where: {
        id: params.id,
      },
      include: {
        students: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!existingSiblingGroup) {
      return NextResponse.json(
        { error: 'Sibling group not found' },
        { status: 404 }
      )
    }

    // Update all students to remove the sibling group ID
    await prisma.student.updateMany({
      where: {
        siblingGroupId: params.id,
      },
      data: {
        siblingGroupId: null,
      },
    })

    // Delete the sibling group
    await prisma.sibling.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete sibling group:', error)
    return NextResponse.json(
      { error: 'Failed to delete sibling group' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
