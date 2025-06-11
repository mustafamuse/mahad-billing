import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting data export with Prisma Client...')

  try {
    // Fetch all data from all relevant tables
    const students = await prisma.student.findMany()
    const payers = await prisma.payer.findMany()
    // Use a raw query for subscriptions to bypass the enum validation error
    const subscriptions = await prisma.$queryRaw`SELECT * FROM "Subscription"`
    const batches = await prisma.batch.findMany()
    const studentPayments = await prisma.studentPayment.findMany()
    const siblingGroups = await prisma.sibling.findMany()
    // Add any other models you need to back up here

    const backupData = {
      students,
      payers,
      subscriptions,
      batches,
      studentPayments,
      siblingGroups,
      exportDate: new Date().toISOString(),
    }

    const outputPath = path.resolve(process.cwd(), 'prisma-backup.json')
    await fs.writeFile(outputPath, JSON.stringify(backupData, null, 2))

    console.log('✅ Data export complete!')
    console.log(
      `Saved ${students.length} students, ${payers.length} payers, and other data to:`
    )
    console.log(outputPath)
  } catch (error) {
    console.error('❌ An error occurred during the data export:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
