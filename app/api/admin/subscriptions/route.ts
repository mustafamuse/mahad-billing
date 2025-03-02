import { NextResponse } from 'next/server'

import { getStudentSubscriptions } from '@/lib/queries/subscriptions'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batchId')

    const subscriptions = await getStudentSubscriptions()

    // Filter by batch if batchId is provided
    const filteredSubscriptions = batchId
      ? subscriptions.filter((sub) => sub.student.batchId === batchId)
      : subscriptions

    return NextResponse.json(filteredSubscriptions)
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
