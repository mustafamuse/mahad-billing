import { prisma } from '../lib/db'

async function fixDuplicateEmails() {
  console.log('Fixing duplicate emails in Student table...')

  // Get all students with emails
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
      createdAt: true,
      updatedAt: true,
      batchId: true,
    },
    orderBy: {
      email: 'asc',
    },
  })

  console.log(`Found ${students.length} students with emails`)

  // Group by email
  const emailGroups: Record<string, typeof students> = {}

  for (const student of students) {
    if (!student.email) continue

    const email = student.email.toLowerCase()
    if (!emailGroups[email]) {
      emailGroups[email] = []
    }
    emailGroups[email].push(student)
  }

  // Find duplicates
  const duplicates = Object.entries(emailGroups)
    .filter(([_, group]) => group.length > 1)
    .map(([email, group]) => ({
      email,
      count: group.length,
      students: group.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    }))

  if (duplicates.length === 0) {
    console.log('No duplicate emails found! Safe to add unique constraint.')
    return
  }

  console.log(`Found ${duplicates.length} emails with duplicates. Fixing...`)

  // Fix each duplicate group
  for (const { email, students } of duplicates) {
    console.log(`\nFixing email: ${email} (${students.length} records)`)

    // Keep the first record (most recently updated) as is
    const [keepRecord, ...duplicateRecords] = students

    console.log(`Keeping record: ${keepRecord.id} (${keepRecord.name})`)

    // Update the duplicate records with modified emails
    for (let index = 0; index < duplicateRecords.length; index++) {
      const record = duplicateRecords[index]
      const newEmail = `${record.email!.split('@')[0]}.duplicate${index + 1}@${record.email!.split('@')[1]}`

      console.log(`Updating record: ${record.id} (${record.name})`)
      console.log(`  Old email: ${record.email}`)
      console.log(`  New email: ${newEmail}`)

      await prisma.student.update({
        where: { id: record.id },
        data: { email: newEmail },
      })
    }
  }
}

fixDuplicateEmails()
  .then(() => {
    console.log('\nAll duplicate emails have been fixed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error fixing duplicate emails:', error)
    process.exit(1)
  })
