'use server'

import { EducationLevel, GradeLevel } from '@prisma/client'

import { prisma } from '@/lib/db'

export interface BatchStudentData {
  id: string
  name: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  educationLevel: EducationLevel | null
  gradeLevel: GradeLevel | null
  schoolName: string | null
  status: string
  createdAt: string
  updatedAt: string
  batch: {
    id: string
    name: string
    startDate: string | null
    endDate: string | null
  } | null
  siblingGroup: {
    id: string
    students: {
      id: string
      name: string
      status: string
    }[]
  } | null
}

export async function getBatchData(): Promise<BatchStudentData[]> {
  const startTime = performance.now()
  let queryTime: number
  let transformTime: number

  try {
    console.log('🔍 Starting optimized student fetch...')

    // Measure database query time
    const queryStartTime = performance.now()
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
            startDate: true,
            endDate: true,
          },
        },
        siblingGroup: {
          select: {
            id: true,
            students: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    })
    queryTime = performance.now() - queryStartTime

    // Transform and filter siblings in memory
    const transformStartTime = performance.now()
    const transformedStudents = students.map((student) => ({
      ...student,
      dateOfBirth: student.dateOfBirth?.toISOString() ?? null,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      batch: student.batch
        ? {
            ...student.batch,
            startDate: student.batch.startDate?.toISOString() ?? null,
            endDate: student.batch.endDate?.toISOString() ?? null,
          }
        : null,
      siblingGroup: student.siblingGroup
        ? {
            id: student.siblingGroup.id,
            students: student.siblingGroup.students.filter(
              (s) => s.id !== student.id
            ),
          }
        : null,
    }))
    transformTime = performance.now() - transformStartTime

    // Log query stats with corrected sibling counting
    const siblingStats = transformedStudents.reduce(
      (acc, student) => {
        if (student.siblingGroup?.students.length) {
          acc.withSiblings++
          acc.totalSiblingConnections += student.siblingGroup.students.length
        }
        return acc
      },
      { withSiblings: 0, totalSiblingConnections: 0 }
    )

    console.log('📊 Query Stats:', {
      queryTimeMs: queryTime.toFixed(2),
      totalStudents: students.length,
      studentsWithSiblings: siblingStats.withSiblings,
      avgSiblingsPerStudent: siblingStats.withSiblings
        ? (
            siblingStats.totalSiblingConnections / siblingStats.withSiblings
          ).toFixed(2)
        : '0.00',
    })

    // Log final performance metrics
    const totalTime = performance.now() - startTime
    console.log('✅ Performance Metrics:', {
      totalTimeMs: totalTime.toFixed(2),
      queryTimeMs: queryTime.toFixed(2),
      transformTimeMs: transformTime.toFixed(2),
      queryPercent: ((queryTime / totalTime) * 100).toFixed(1) + '%',
      transformPercent: ((transformTime / totalTime) * 100).toFixed(1) + '%',
    })

    // Verify sibling data integrity with more detail
    const sampleStudent = transformedStudents.find(
      (s) => s.siblingGroup?.students.length
    )
    if (sampleStudent) {
      console.log('🔍 Sample Sibling Data:', {
        studentName: sampleStudent.name,
        siblingGroupId: sampleStudent.siblingGroup?.id,
        siblingCount: sampleStudent.siblingGroup?.students.length,
        siblings: sampleStudent.siblingGroup?.students.map((s) => s.name),
      })
    }

    return transformedStudents
  } catch (error) {
    console.error('❌ Error fetching students:', {
      error,
      timeElapsed: `${(performance.now() - startTime).toFixed(2)}ms`,
    })
    throw new Error('Failed to fetch students')
  }
}

export async function getDuplicateStudents() {
  const duplicates = await prisma.student.groupBy({
    by: ['email'],
    having: {
      email: {
        _count: {
          gt: 1,
        },
      },
    },
  })

  const duplicateGroups = await Promise.all(
    duplicates.map(async ({ email }) => {
      if (!email) return null // Skip null emails

      const records = await prisma.student.findMany({
        where: { email },
        include: {
          siblingGroup: true,
        },
        orderBy: [
          { siblingGroup: { id: 'desc' } },
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
      })

      if (!records.length) return null

      const [keepRecord, ...duplicateRecords] = records

      // Find differences between records
      const differences: Record<string, Set<string>> = {}
      const fields = ['name', 'dateOfBirth', 'status'] as const

      fields.forEach((field) => {
        const values = new Set(records.map((r) => String(r[field] || '')))
        if (values.size > 1) differences[field] = values
      })

      return {
        email,
        count: records.length,
        keepRecord: {
          ...keepRecord,
          createdAt: keepRecord.createdAt.toISOString(),
          updatedAt: keepRecord.updatedAt.toISOString(),
        },
        duplicateRecords: duplicateRecords.map((record) => ({
          ...record,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        })),
        hasSiblingGroup: !!keepRecord.siblingGroup,
        hasRecentActivity:
          new Date().getTime() - keepRecord.updatedAt.getTime() <
          30 * 24 * 60 * 60 * 1000,
        differences,
        lastUpdated: keepRecord.updatedAt.toISOString(),
      }
    })
  )

  return duplicateGroups.filter(
    (group): group is NonNullable<typeof group> => group !== null
  )
}

export async function deleteDuplicateRecords(recordIds: string[]) {
  try {
    await prisma.student.deleteMany({
      where: {
        id: {
          in: recordIds,
        },
      },
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to delete duplicate records:', error)
    throw error
  }
}
