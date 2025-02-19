'use server'

import { EducationLevel, GradeLevel } from '@prisma/client'

import { prisma } from '@/lib/db'

export interface BatchStudentData {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'registered' | 'enrolled' | 'on_leave' | 'withdrawn'
  educationLevel: EducationLevel | null
  gradeLevel: GradeLevel | null
  createdAt: string // ISO string
  batch: {
    id: string
    name: string
    startDate: string | null // ISO string
    endDate: string | null // ISO string
  } | null
  siblingGroup: {
    id: string
    students: {
      id: string
      name: string
      status: 'registered' | 'enrolled' | 'on_leave' | 'withdrawn'
    }[]
  } | null
}

export async function getBatchData(): Promise<BatchStudentData[]> {
  try {
    const students = await Promise.all(
      (
        await prisma.student.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            educationLevel: true,
            gradeLevel: true,
            createdAt: true,
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
                  where: {
                    NOT: {
                      id: { equals: '' },
                    },
                  },
                  select: {
                    id: true,
                    name: true,
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
      ).map(async (student) => {
        if (student.siblingGroup) {
          const siblings = await prisma.student.findMany({
            where: {
              siblingGroupId: student.siblingGroup.id,
              NOT: {
                id: student.id,
              },
            },
            select: {
              id: true,
              name: true,
              status: true,
            },
          })
          return {
            ...student,
            siblingGroup: {
              ...student.siblingGroup,
              students: siblings,
            },
          }
        }
        return student
      })
    )

    // Define the type for our plain student object
    type PlainStudent = {
      id: string
      name: string
      email: string | null
      phone: string | null
      status: string
      educationLevel: EducationLevel | null
      gradeLevel: GradeLevel | null
      createdAt: string
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

    // Convert Prisma objects to plain objects with proper typing
    const plainStudents: PlainStudent[] = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      status: student.status,
      educationLevel: student.educationLevel,
      gradeLevel: student.gradeLevel,
      createdAt: student.createdAt.toISOString(),
      batch: student.batch
        ? {
            id: student.batch.id,
            name: student.batch.name,
            startDate: student.batch.startDate?.toISOString() ?? null,
            endDate: student.batch.endDate?.toISOString() ?? null,
          }
        : null,
      siblingGroup: student.siblingGroup
        ? {
            id: student.siblingGroup.id,
            students: student.siblingGroup.students.map((s) => ({
              id: s.id,
              name: s.name,
              status: s.status,
            })),
          }
        : null,
    }))

    // Single log at the end
    console.log('📊 Students fetched:', { count: plainStudents.length })

    return plainStudents as BatchStudentData[]
  } catch (error) {
    console.error('❌ Server Error:', error)
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
