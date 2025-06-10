import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

// Helper to clean data before insertion, converting empty strings to null
// and ensuring proper types for numbers and booleans.
function cleanRecord(record, model) {
  const cleaned = {}
  for (const key in record) {
    let value = record[key]

    // Skip relations or undefined fields
    if (typeof value === 'object' && value !== null) continue
    if (value === undefined) continue

    // Convert empty strings to null
    if (value === '') value = null

    // Handle specific type conversions
    if (model === 'Student') {
      const intFields = [
        'monthlyRate',
        'collegeGradYear',
        'highSchoolGradYear',
        'postGradYear',
      ]
      const boolFields = [
        'customRate',
        'collegeGraduated',
        'highSchoolGraduated',
        'postGradCompleted',
      ]
      if (intFields.includes(key) && value !== null) value = parseInt(value, 10)
      if (boolFields.includes(key) && value !== null)
        value = String(value).toLowerCase() === 'true'
    }

    if (
      model === 'Subscription' &&
      key === 'paymentRetryCount' &&
      value !== null
    ) {
      value = parseInt(value, 10)
    }

    if (model === 'StudentPayment' && key === 'amountPaid' && value !== null) {
      value = parseInt(value, 10)
    }

    cleaned[key] = value
  }
  return cleaned
}

async function main() {
  console.log('Starting to seed the database...')

  try {
    // 1. Load the transformed data
    const dataPath = path.resolve(
      process.cwd(),
      'transformed-data-for-seed.json'
    )
    const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'))
    console.log('✅ Loaded transformed data file.')

    // 2. Seed data in the correct order to maintain relationships
    // Batches and SiblingGroups first as they have no dependencies
    if (data.batches) {
      for (const batch of data.batches) {
        await prisma.batch.create({ data: cleanRecord(batch) })
      }
      console.log(`🌱 Seeded ${data.batches.length} batches.`)
    }

    if (data.siblingGroups) {
      for (const group of data.siblingGroups) {
        await prisma.sibling.create({ data: cleanRecord(group) })
      }
      console.log(`🌱 Seeded ${data.siblingGroups.length} sibling groups.`)
    }

    // Then Students
    if (data.students) {
      for (const student of data.students) {
        await prisma.student.create({ data: cleanRecord(student, 'Student') })
      }
      console.log(`🌱 Seeded ${data.students.length} students.`)
    }

    // Then Subscriptions, which depend on Students
    if (data.subscriptions) {
      for (const sub of data.subscriptions) {
        await prisma.subscription.create({
          data: cleanRecord(sub, 'Subscription'),
        })
      }
      console.log(`🌱 Seeded ${data.subscriptions.length} subscriptions.`)
    }

    // Then StudentPayments, which depend on Students
    if (data.studentPayments) {
      for (const payment of data.studentPayments) {
        await prisma.studentPayment.create({
          data: cleanRecord(payment, 'StudentPayment'),
        })
      }
      console.log(`🌱 Seeded ${data.studentPayments.length} student payments.`)
    }

    // Add other models here if necessary, in dependency order...

    console.log('✅ Database seeding complete!')
  } catch (error) {
    console.error('❌ An error occurred during database seeding:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
