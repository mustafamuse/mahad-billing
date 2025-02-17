import { NextResponse } from 'next/server'

import { monitoring } from '@/lib/monitoring'

export async function GET() {
  const stats = await monitoring.getRateLimitStats()

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    stats,
  })
}
