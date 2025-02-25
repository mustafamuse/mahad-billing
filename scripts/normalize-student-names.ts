import { prisma } from '../lib/db'

// Helper function for consistent capitalization
function normalizeName(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

async function normalizeStudentNames() {
  console.log('Normalizing student names...')

  // Get all students
  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
    },
  })

  console.log(`Found ${students.length} students`)

  let updatedCount = 0
  const updates: Array<{ id: string; oldName: string; newName: string }> = []

  // Process each student
  for (const student of students) {
    const normalizedName = normalizeName(student.name)

    // Only update if the name is different
    if (normalizedName !== student.name) {
      updates.push({
        id: student.id,
        oldName: student.name,
        newName: normalizedName,
      })

      await prisma.student.update({
        where: { id: student.id },
        data: { name: normalizedName },
      })

      updatedCount++
    }
  }

  // Print results
  console.log(`\nUpdated ${updatedCount} student names:`)

  updates.forEach(({ id, oldName, newName }) => {
    console.log(`ID: ${id}`)
    console.log(`  Old: "${oldName}"`)
    console.log(`  New: "${newName}"`)
  })

  return updatedCount
}

normalizeStudentNames()
  .then((count) => {
    console.log(`\nNormalization completed. Updated ${count} student names.`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error normalizing student names:', error)
    process.exit(1)
  })
