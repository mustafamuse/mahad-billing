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
  try {
    const students = await prisma.student.findMany({
      where: {
        email: {
          not: null,
        },
      },
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
        siblingGroupId: true,
        siblingGroup: {
          select: {
            id: true,
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

    const plainStudents = students.map((student) => ({
      ...student,
      createdAt: student.createdAt.toISOString(),
      dateOfBirth: student.dateOfBirth?.toISOString() || null,
    }))

    const groupedByEmail = plainStudents.reduce(
      (acc, student) => {
        const email = student.email as string
        if (!acc[email]) {
          acc[email] = []
        }
        acc[email].push(student)
        return acc
      },
      {} as Record<string, typeof plainStudents>
    )

    const duplicates = Object.entries(groupedByEmail)
      .filter(([_, students]) => students.length > 1)
      .map(([email, students]) => {
        const sortedStudents = students.sort((a, b) => {
          if (a.siblingGroupId && !b.siblingGroupId) return -1
          if (!a.siblingGroupId && b.siblingGroupId) return 1
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        })

        const keepRecord = sortedStudents[0]
        const duplicateRecords = sortedStudents.slice(1)

        const differences: Record<string, Set<any>> = {}
        const fields = Object.keys(students[0]) as Array<
          keyof (typeof students)[0]
        >

        fields
          .filter(
            (k) =>
              !['id', 'createdAt', 'siblingGroup', 'siblingGroupId'].includes(k)
          )
          .forEach((field) => {
            const values = new Set(students.map((s) => s[field]))
            if (values.size > 1) {
              differences[field] = values
            }
          })

        return {
          email,
          count: students.length,
          keepRecord,
          duplicateRecords,
          hasSiblingGroup: !!keepRecord.siblingGroupId,
          differences: Object.keys(differences).length > 0 ? differences : null,
        }
      })

    return duplicates
  } catch (error) {
    console.error('❌ Error in getDuplicateStudents:', error)
    throw error
  }
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
