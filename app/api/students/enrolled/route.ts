import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

// Add force-dynamic to ensure this route is always dynamic
export const dynamic = 'force-dynamic'

// Add proper caching headers
export async function GET() {
  try {
    // Attempt to fetch cached enrolled students
    const cachedEnrolledStudents = await redis.get('enrolled_students')
    if (cachedEnrolledStudents) {
      try {
        const parsedCachedData =
          typeof cachedEnrolledStudents === 'string'
            ? JSON.parse(cachedEnrolledStudents)
            : cachedEnrolledStudents

        if (Array.isArray(parsedCachedData)) {
          console.log('Returning cached enrolled students:', parsedCachedData)
          return NextResponse.json(
            { enrolledStudents: parsedCachedData },
            {
              headers: {
                'Cache-Control':
                  'public, s-maxage=60, stale-while-revalidate=30',
              },
            }
          )
        }
      } catch (error) {
        console.error('Error parsing cached enrolled students:', error)
      }
    }

    console.log('Fetching data from Stripe and Redis...')

    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      expand: ['data.customer'],
    })

    const enrolledStudentIds = new Set<string>()

    for (const subscription of subscriptions.data) {
      let customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

      if (!customerId) {
        console.warn(`Customer ID missing for subscription: ${subscription.id}`)
        continue
      }

      const metadataKey = `setup_intent_metadata:${customerId}`
      const metadataFromRedis = await redis.get(metadataKey)

      if (!metadataFromRedis) {
        console.warn(`No metadata found for customer ID: ${customerId}`)
        continue
      }

      let parsedMetadata
      try {
        parsedMetadata =
          typeof metadataFromRedis === 'string'
            ? JSON.parse(metadataFromRedis)
            : metadataFromRedis
      } catch (error) {
        console.error(
          `Failed to parse metadata for customer ${customerId}:`,
          error
        )
        continue
      }

      const { studentKey } = parsedMetadata || {}
      if (!studentKey) {
        console.warn(
          `Student key missing in metadata for customer ID: ${customerId}`
        )
        continue
      }

      const studentsFromRedis = await redis.get(studentKey)

      if (!studentsFromRedis) {
        console.warn(`No students found for student key: ${studentKey}`)
        continue
      }

      let students
      try {
        students =
          typeof studentsFromRedis === 'string'
            ? JSON.parse(studentsFromRedis)
            : studentsFromRedis
      } catch (error) {
        console.error(`Failed to parse students for key ${studentKey}:`, error)
        continue
      }

      if (Array.isArray(students)) {
        students.forEach((student: { id: string }) => {
          if (student.id) enrolledStudentIds.add(student.id)
        })
      } else {
        console.warn(`Unexpected format for students under key ${studentKey}`)
      }
    }

    const enrolledStudentsArray = Array.from(enrolledStudentIds)

    if (enrolledStudentsArray.length > 0) {
      await redis.set(
        'enrolled_students',
        JSON.stringify(enrolledStudentsArray),
        {
          ex: 60,
        }
      )
    }

    return NextResponse.json(
      { enrolledStudents: enrolledStudentsArray },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching enrolled students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrolled students', enrolledStudents: [] },
      { status: 500 }
    )
  }
}
