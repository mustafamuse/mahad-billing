import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params

    // First, update all students in this group to remove their siblingGroupId
    await prisma.student.updateMany({
      where: {
        siblingGroupId: groupId,
      },
      data: {
        siblingGroupId: null,
      },
    })

    // Then delete the sibling group
    await prisma.sibling.delete({
      where: {
        id: groupId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove sibling group:', error)
    return NextResponse.json(
      { error: 'Failed to remove sibling group' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
