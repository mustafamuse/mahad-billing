import { NextResponse } from 'next/server'

import { findUnlinkedSubscriptions } from '@/lib/queries/stripe-reconciliation'

export async function GET() {
  try {
    const unlinkedSubscriptions = await findUnlinkedSubscriptions()
    return NextResponse.json({ success: true, data: unlinkedSubscriptions })
  } catch (error) {
    console.error('Failed to find unlinked subscriptions:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
