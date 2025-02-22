'use server'

import fs from 'fs'
import path from 'path'

import { prisma } from '@/lib/db'

// Add validation types
interface BackupValidation {
  students: {
    total: number
    withBatch: number
    withPayer: number
    withSiblings: number
  }
  relationships: {
    validSiblingGroups: boolean
    validPayerLinks: boolean
    validBatchLinks: boolean
  }
}

export async function backupData() {
  try {
    // First validate the data
    console.log('🔍 Starting data validation...')

    // Get all data with complete relationships
    const students = await prisma.student.findMany({
      include: {
        batch: true,
        payer: {
          include: {
            subscriptions: true,
          },
        },
        siblingGroup: {
          include: {
            students: {
              select: {
                id: true,
                name: true,
                status: true,
                siblingGroupId: true,
              },
            },
          },
        },
      },
    })

    // Validate relationships
    const validation: BackupValidation = {
      students: {
        total: students.length,
        withBatch: students.filter((s) => s.batch).length,
        withPayer: students.filter((s) => s.payer).length,
        withSiblings: students.filter((s) => s.siblingGroup).length,
      },
      relationships: {
        validSiblingGroups: students.every(
          (s) =>
            !s.siblingGroupId ||
            s.siblingGroup?.students.some(
              (sibling) =>
                sibling.id !== s.id &&
                sibling.siblingGroupId === s.siblingGroupId
            )
        ),
        validPayerLinks: students.every((s) => !s.payerId || s.payer !== null),
        validBatchLinks: students.every((s) => !s.batchId || s.batch !== null),
      },
    }

    console.log('✅ Data validation complete:', validation)

    // Continue with backup if validation passes
    if (!Object.values(validation.relationships).every(Boolean)) {
      throw new Error('Data validation failed: Invalid relationships detected')
    }

    // Rest of your existing backup code...
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        validation,
        totalCounts: {
          students: students.length,
          batches: students.filter((s) => s.batch).length,
          siblings: students.filter((s) => s.siblingGroup).length,
          payers: students.filter((s) => s.payer).length,
          subscriptions: students.reduce(
            (acc, s) => acc + (s.payer?.subscriptions.length || 0),
            0
          ),
        },
      },
      data: {
        students,
        batches: students.filter((s) => s.batch),
        siblings: students.filter((s) => s.siblingGroup),
        payers: students.filter((s) => s.payer),
        subscriptions: students.reduce(
          (acc, s) => acc + (s.payer?.subscriptions.length || 0),
          0
        ),
      },
    }

    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir)
    }

    // Save to JSON file with detailed timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `backup-${timestamp}.json`

    fs.writeFileSync(
      path.join(backupDir, fileName),
      JSON.stringify(backup, null, 2)
    )

    // Log backup stats
    console.log('✅ Backup completed:', {
      fileName,
      counts: backup.metadata.totalCounts,
      size: `${(JSON.stringify(backup).length / 1024 / 1024).toFixed(2)}MB`,
    })

    return {
      success: true,
      fileName,
      validation,
      stats: backup.metadata.totalCounts,
    }
  } catch (error) {
    console.error('❌ Backup failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
