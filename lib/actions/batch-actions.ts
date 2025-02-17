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
