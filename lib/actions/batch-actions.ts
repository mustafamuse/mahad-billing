'use server'

import { format } from 'date-fns'
import * as XLSX from 'xlsx'

import { prisma } from '@/lib/db'

import { getStudentCompleteness } from '../utils/student-validation'

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

export async function transferStudentsToBatch(
  destinationBatchId: string,
  studentIds: string[]
) {
  try {
    const updates = await prisma.$transaction(
      studentIds.map((studentId) =>
        prisma.student.update({
          where: { id: studentId },
          data: { batchId: destinationBatchId },
        })
      )
    )

    return { success: true, count: updates.length }
  } catch (error) {
    console.error('Failed to transfer students:', error)
    throw new Error('Failed to transfer students')
  }
}

export async function exportIncompleteStudents() {
  try {
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        educationLevel: true,
        gradeLevel: true,
        schoolName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
        siblingGroup: {
          select: {
            id: true,
          },
        },
      },
    })

    const incompleteStudents = students
      .map((student) => {
        const { isComplete, missingFields } = getStudentCompleteness({
          ...student,
          dateOfBirth: student.dateOfBirth?.toISOString() ?? null,
          createdAt: student.createdAt.toISOString(),
          updatedAt: student.updatedAt.toISOString(),
          batch: student.batch
            ? {
                ...student.batch,
                startDate: null,
                endDate: null,
              }
            : null,
          siblingGroup: student.siblingGroup
            ? {
                ...student.siblingGroup,
                students: [],
              }
            : null,
        })

        if (!isComplete) {
          return {
            Name: student.name,
            Email: student.email ?? 'N/A',
            Phone: student.phone ?? 'N/A',
            'Missing Fields': missingFields.join(', '),
            'Last Updated': format(student.updatedAt, 'MMM d, yyyy'),
            Batch: student.batch?.name ?? 'Unassigned',
            Status: student.status,
          }
        }
        return null
      })
      .filter(
        (student): student is NonNullable<typeof student> => student !== null
      )

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(incompleteStudents, {
      header: [
        'Name',
        'Email',
        'Phone',
        'Missing Fields',
        'Last Updated',
        'Batch',
        'Status',
      ],
    })

    ws['!cols'] = [
      { wch: 30 }, // Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 30 }, // Missing Fields
      { wch: 15 }, // Last Updated
      { wch: 20 }, // Batch
      { wch: 15 }, // Status
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Incomplete Students')

    // Convert to base64 string instead of buffer
    const b64 = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'base64',
    })

    return b64
  } catch (error) {
    console.error('Failed to export incomplete students:', error)
    throw new Error('Failed to export incomplete students')
  }
}
