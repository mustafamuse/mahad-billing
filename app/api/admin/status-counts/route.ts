import { NextResponse } from 'next/server'

import { STUDENTS } from '@/lib/data'
import { stripeServerClient } from '@/lib/stripe'
import { parseStudentMetadata } from '@/lib/utils/parse-students'

export async function GET() {
  try {
    const subscriptions = await stripeServerClient.subscriptions.list({
      expand: ['data.customer'],
    })

    // Create a map of subscribed students
    const subscribedStudentsMap = new Map()
    subscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata || {}
      const students = parseStudentMetadata(metadata.students)
      students.forEach((student) => {
        subscribedStudentsMap.set(student.name, subscription.status)
      })
    })

    // Count students by status
    const statusCounts = STUDENTS.reduce(
      (acc, student) => {
        const status = subscribedStudentsMap.get(student.name) || 'not_enrolled'
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json(statusCounts)
  } catch (error) {
    console.error('Status counts fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status counts' },
      { status: 500 }
    )
  }
}
