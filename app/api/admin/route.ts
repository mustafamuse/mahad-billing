import { NextResponse } from 'next/server'

import { getDashboardData } from '@/lib/services/admin-dashboard'

export async function GET() {
  try {
    const data = await getDashboardData()

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        Vary: 'Authorization',
      },
    })
  } catch (error) {
    console.error('Admin route error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch admin data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
