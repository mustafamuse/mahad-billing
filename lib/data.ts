import { PrismaClient } from '@prisma/client'

import { Student } from './types'

const prisma = new PrismaClient()

export const BASE_RATE = 150 // Move this to a constants file later

export async function getStudents(): Promise<Student[]> {
  const students = await prisma.student.findMany({
    include: {
      familyGroup: true,
      classGroups: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  const studentsWithFamilyInfo = await Promise.all(
    students.map(async (student) => {
      const totalFamilyMembers = await getFamilyMembers(student.familyId)
      return {
        id: student.id,
        name: student.name,
        className: student.className,
        monthlyRate: student.monthlyRate,
        hasCustomRate: student.customRate,
        familyId: student.familyId,
        familyName: student.name.split(' ').slice(-1)[0], // Extract family name from student's name
        siblings: Math.max(0, totalFamilyMembers - 1), // Subtract self from total
        totalFamilyMembers,
      }
    })
  )

  return studentsWithFamilyInfo
}

// Helper function to calculate family members
export async function getFamilyMembers(
  familyId: string | null
): Promise<number> {
  if (!familyId) return 0

  const count = await prisma.student.count({
    where: {
      familyId,
    },
  })

  return count
}

// Close Prisma client when the app shuts down
process.on('beforeExit', () => {
  prisma.$disconnect()
})
