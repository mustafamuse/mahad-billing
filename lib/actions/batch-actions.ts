'use server'

import { prisma } from '@/lib/db'

export interface BatchWithCount {
  id: string
  name: string
  startDate: string | null
  studentCount: number
}

export async function getAllBatches(): Promise<BatchWithCount[]> {
  try {
    const batches = await prisma.batch.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return batches.map((batch) => ({
      id: batch.id,
      name: batch.name,
      startDate: batch.startDate?.toISOString() ?? null,
      studentCount: batch._count.students,
    }))
  } catch (error) {
    console.error('Failed to fetch batches:', error)
    throw new Error('Failed to fetch batches')
  }
}

export async function createBatch(name: string) {
  try {
    const batch = await prisma.batch.create({
      data: { name },
    })
    return { success: true, batch }
  } catch (error) {
    console.error('Failed to create batch:', error)
    throw new Error('Failed to create batch')
  }
}

export async function assignStudentsToBatch(
  batchId: string,
  studentIds: string[]
) {
  try {
    console.log('📝 Assigning students:', {
      batchId,
      studentCount: studentIds.length,
      studentIds,
    })

    await prisma.student.updateMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      data: {
        batchId,
      },
    })

    // Verify the update
    const updatedStudents = await prisma.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      select: {
        id: true,
        name: true,
        batchId: true,
      },
    })

    console.log('✅ Assignment result:', {
      expected: studentIds.length,
      updated: updatedStudents.filter((s) => s.batchId === batchId).length,
      students: updatedStudents,
    })

    return { success: true }
  } catch (error) {
    console.error('❌ Failed to assign students:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to assign students'
    )
  }
}
