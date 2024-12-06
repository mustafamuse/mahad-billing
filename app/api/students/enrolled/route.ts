import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { parseStudentMetadata } from '@/lib/utils/parse-students'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      expand: ['data.customer'],
    })

    const enrolledStudents = new Set<string>()

    subscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata || {}
      const students = parseStudentMetadata(metadata.students)
      students.forEach((student) => {
        enrolledStudents.add(student.id)
      })
    })

    return NextResponse.json({ enrolledStudents: Array.from(enrolledStudents) })
  } catch (error) {
    console.error('Error fetching enrolled students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrolled students' },
      { status: 500 }
    )
  }
}
