'use server'

import { prisma } from '@/lib/db'

export async function getBatchesForFilter() {
  try {
    const batches = await prisma.batch.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
    return batches
  } catch (error) {
    console.error('Failed to fetch batches:', error)
    // In a real app, you'd want to handle this error more gracefully
    return []
  }
}
