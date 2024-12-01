import { NextResponse } from 'next/server'

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    // Fetch all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      expand: ['data.customer'],
    })

    // Extract enrolled student IDs from subscription metadata
    const enrolledStudents = new Set<string>()

    subscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata || {}
      try {
        const students = JSON.parse(metadata.students || '[]')
        students.forEach((student: { id: string }) => {
          enrolledStudents.add(student.id)
        })
      } catch (e) {
        console.error('Error parsing students metadata:', e)
      }
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
