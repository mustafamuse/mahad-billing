import { STUDENTS } from '@/lib/data'
import { Student, StudentMetadata } from '@/lib/types'

export function formatStudentMetadata(students: Student[]): string {
  const metadata: StudentMetadata[] = students.map((student) => ({
    id: student.id,
    name: student.name,
    familyId: student.familyId,
    totalFamilyMembers: student.totalFamilyMembers,
  }))
  return JSON.stringify(metadata)
}

export function parseStudentMetadata(
  metadata: string | unknown
): StudentMetadata[] {
  try {
    // If it's already an array, validate its structure
    if (Array.isArray(metadata)) {
      return metadata.map((student) => ({
        id: student.id,
        name: student.name,
        familyId: student.familyId,
        totalFamilyMembers: student.totalFamilyMembers,
      }))
    }

    // If it's a string, try to parse it
    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata)
        if (Array.isArray(parsed)) {
          return parsed.map((student) => ({
            id: student.id,
            name: student.name,
            familyId: student.familyId,
            totalFamilyMembers: student.totalFamilyMembers,
          }))
        }
        // If it's a single student name string
        const student = STUDENTS.find((s) => s.name === metadata)
        if (student) {
          return [
            {
              id: student.id,
              name: student.name,
              familyId: student.familyId,
              totalFamilyMembers: student.totalFamilyMembers,
            },
          ]
        }
      } catch {
        // If JSON parsing fails, check if it's a single student name
        const student = STUDENTS.find((s) => s.name === metadata)
        if (student) {
          return [
            {
              id: student.id,
              name: student.name,
              familyId: student.familyId,
              totalFamilyMembers: student.totalFamilyMembers,
            },
          ]
        }
      }
    }

    return []
  } catch (error) {
    console.error('Error parsing student metadata:', error)
    return []
  }
}
