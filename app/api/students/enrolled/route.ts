import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { parseStudentMetadata } from '@/lib/utils/parse-students'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    const subscriptions = await stripe.subscriptions.list({
      status: 'active', // Only get active subscriptions
      expand: ['data.customer'],
    })

    // Track enrolled student IDs
    const enrolledStudentIds = new Set<string>()

    subscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata || {}
      const students = parseStudentMetadata(metadata.students)

      students.forEach((student) => {
        // Add the student ID to our set
        enrolledStudentIds.add(student.id)
      })
    })

    // Log for debugging
    console.log(
      'Currently enrolled student IDs:',
      Array.from(enrolledStudentIds)
    )

    return NextResponse.json({
      enrolledStudents: Array.from(enrolledStudentIds),
    })
  } catch (error) {
    console.error('Error fetching enrolled students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrolled students' },
      { status: 500 }
    )
  }
}
