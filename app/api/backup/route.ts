import { NextResponse } from 'next/server'

import { backupData } from '@/lib/actions/backup-data'

export async function GET() {
  try {
    const result = await backupData()
    return NextResponse.json({
      ...result,
      viewUrl: `/backups/${result.fileName}`,
    })
  } catch (error: unknown) {
    console.error('Backup failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Backup failed',
      },
      { status: 500 }
    )
  }
}
