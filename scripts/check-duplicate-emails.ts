import { prisma } from '../lib/db'

async function checkDuplicateEmails() {
  console.log('Checking for duplicate emails in Student table...')

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

  console.log(`Found ${duplicates.length} emails with duplicates:`)

  // Print details of duplicates
  duplicates.forEach(({ email, count, students }) => {
    console.log(`\nEmail: ${email} (${count} records)`)
    students.forEach((student, index) => {
      console.log(`  ${index + 1}. ID: ${student.id}`)
      console.log(`     Name: ${student.name}`)
      console.log(`     Created: ${student.createdAt.toISOString()}`)
      console.log(`     Updated: ${student.updatedAt.toISOString()}`)
      console.log(`     Batch: ${student.batchId || 'None'}`)
    })
  })
}

checkDuplicateEmails()
  .then(() => {
    console.log('Check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error checking for duplicate emails:', error)
    process.exit(1)
  })
