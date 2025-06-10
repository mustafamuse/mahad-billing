import fs from 'fs/promises'
import path from 'path'

// This script transforms the JSON data exported from the old schema
// into a new format that matches the updated schema (with no Payer model),
// ignoring the Payer data completely as requested.

async function main() {
  console.log(
    'Starting simplified data transformation from prisma-backup.json...'
  )

  try {
    // --- 1. Load Data from JSON Backup ---
    const backupPath = path.resolve(process.cwd(), 'prisma-backup.json')
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'))
    // We only need students and subscriptions for the transformation
    const { students, subscriptions } = backupData

    console.log(
      `✅ Loaded ${students.length} students and ${subscriptions.length} subscriptions from backup.`
    )

    // --- 2. Create Student Lookup Map ---
    // Create a map of students indexed by their Stripe Subscription ID for fast lookups.
    const studentBySubIdMap = new Map()
    for (const student of students) {
      // Your previous scripts should have populated this ID.
      if (student.stripeSubscriptionId) {
        studentBySubIdMap.set(student.stripeSubscriptionId, student)
      }
    }
    console.log(
      `✅ Created Student-by-Subscription-ID map with ${studentBySubIdMap.size} entries.`
    )

    // --- 3. Transform Subscription Data ---
    // Link subscriptions to the correct student using the unique stripeSubscriptionId
    const transformedSubscriptions = subscriptions
      .map((sub) => {
        const student = studentBySubIdMap.get(sub.stripeSubscriptionId)

        if (!student) {
          console.warn(
            `⚠️ Subscription ${sub.id} (${sub.stripeSubscriptionId}) could not be matched to a student. It will be excluded.`
          )
          return null
        }

        return {
          ...sub,
          status: String(sub.status).toLowerCase(), // Normalize status
          studentId: student.id, // Correctly link to the student
          payerId: undefined, // Remove the old payerId
        }
      })
      .filter(Boolean) // Filter out nulls for unmatched subscriptions

    console.log(
      `✅ Transformed and linked ${transformedSubscriptions.length} subscription records.`
    )

    // --- 4. Prepare Final Student and Output Data ---
    // We just need to remove the now-unnecessary payerId from students
    const transformedStudents = students.map((student) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { payerId, ...rest } = student
      return rest
    })

    const outputData = {
      ...backupData,
      students: transformedStudents,
      subscriptions: transformedSubscriptions,
      payers: undefined, // Ensure payers array is not included
    }

    const outputPath = path.resolve(
      process.cwd(),
      'transformed-data-for-seed.json'
    )
    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2))

    console.log(`✅ Transformed data saved to: ${outputPath}`)
    console.log(
      '\nNext step: Run this script, then seed the database with the new JSON file.'
    )
  } catch (error) {
    console.error('❌ An error occurred during the transformation process:')
    console.error(error)
    process.exit(1)
  }
}

main()
