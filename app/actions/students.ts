'use server'

import { PrismaClient } from '@prisma/client'

import { Student } from '@/lib/types'

const prisma = new PrismaClient()

export async function getStudents(): Promise<Student[]> {
  const students = await prisma.student.findMany({
    include: {
      familyGroup: true,
      classGroups: true,
    },
    orderBy: {
      name: 'asc' as const,
    },
  })

  return students.map((student) => ({
    id: student.id, // UUID from database
    name: student.name,
    className: student.className,
    monthlyRate: student.monthlyRate,
    hasCustomRate: student.customRate,
    familyId: student.familyId,
    familyName: student.name.split(' ').slice(-1)[0], // Extract family name from student's name
    siblings: 0, // We can calculate this if needed for display
    totalFamilyMembers: 0, // We can calculate this if needed for display
  }))
}
