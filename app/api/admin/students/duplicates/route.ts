import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

// Function to calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Function to calculate similarity percentage
function calculateSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  const maxLength = Math.max(a.length, b.length)
  return Math.round(((maxLength - distance) / maxLength) * 100)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'all' // 'exact', 'similar', or 'all'
    const similarityThreshold = parseInt(
      searchParams.get('threshold') || '80',
      10
    )

    // Get all students with necessary details
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        batchId: true,
        siblingGroupId: true,
        batch: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Response object
    const response: {
      exact?: {
        groups: Array<{
          name: string
          count: number
          students: any[]
        }>
        totalGroups: number
        totalStudents: number
      }
      similar?: {
        groups: Array<{
          similarity: number
          students: any[]
        }>
        totalGroups: number
        totalStudents: number
      }
    } = {}

    // Find exact duplicates if mode is 'exact' or 'all'
    if (mode === 'exact' || mode === 'all') {
      // Group students by name
      const studentsByName = students.reduce(
        (acc, student) => {
          const name = student.name
          if (!acc[name]) {
            acc[name] = []
          }
          acc[name].push(student)
          return acc
        },
        {} as Record<string, typeof students>
      )

      // Filter to only include names with multiple students
      const exactDuplicateGroups = Object.entries(studentsByName)
        .filter(([_, groupStudents]) => groupStudents.length > 1)
        .map(([name, groupStudents]) => ({
          name,
          count: groupStudents.length,
          students: groupStudents.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ),
        }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

      response.exact = {
        groups: exactDuplicateGroups,
        totalGroups: exactDuplicateGroups.length,
        totalStudents: exactDuplicateGroups.reduce(
          (acc, group) => acc + group.students.length,
          0
        ),
      }
    }

    // Find similar names if mode is 'similar' or 'all'
    if (mode === 'similar' || mode === 'all') {
      const similarGroups: Array<{
        students: typeof students
        similarity: number
      }> = []

      // Compare each student with every other student
      for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
          // Skip exact matches as they're handled separately
          if (students[i].name === students[j].name) continue

          const similarity = calculateSimilarity(
            students[i].name,
            students[j].name
          )

          if (similarity >= similarityThreshold) {
            // Check if either student is already in a group
            const existingGroupIndex = similarGroups.findIndex((group) =>
              group.students.some(
                (s) => s.id === students[i].id || s.id === students[j].id
              )
            )

            if (existingGroupIndex >= 0) {
              // Add to existing group if not already present
              const group = similarGroups[existingGroupIndex]
              if (!group.students.some((s) => s.id === students[i].id)) {
                group.students.push(students[i])
              }
              if (!group.students.some((s) => s.id === students[j].id)) {
                group.students.push(students[j])
              }
              // Update similarity to the lowest found
              group.similarity = Math.min(group.similarity, similarity)
            } else {
              // Create new group
              similarGroups.push({
                students: [students[i], students[j]],
                similarity,
              })
            }
          }
        }
      }

      // Sort groups by similarity (descending)
      const sortedSimilarGroups = similarGroups
        .sort((a, b) => b.similarity - a.similarity)
        .map((group) => ({
          ...group,
          students: group.students.sort((a, b) => a.name.localeCompare(b.name)),
        }))

      response.similar = {
        groups: sortedSimilarGroups,
        totalGroups: sortedSimilarGroups.length,
        totalStudents: new Set(
          sortedSimilarGroups.flatMap((group) =>
            group.students.map((s) => s.id)
          )
        ).size,
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to check for duplicate students:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicate students' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
