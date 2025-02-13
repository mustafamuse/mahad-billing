import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { studentIds } = await req.json()

    if (!Array.isArray(studentIds) || studentIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 student IDs are required' },
        { status: 400 }
      )
    }

    // Create a new sibling group
    const siblingGroup = await prisma.sibling.create({
      data: {},
    })

    // Update all selected students to be part of this sibling group
    await prisma.student.updateMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      data: {
        siblingGroupId: siblingGroup.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update siblings:', error)
    return NextResponse.json(
      { error: 'Failed to update siblings' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
