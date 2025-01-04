import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    // Fetch active subscriptions and expand customer data
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      expand: ['data.customer'], // Expand customer object
    })

    // Use a Set to track enrolled student IDs (to prevent duplicates)
    const enrolledStudentIds = new Set<string>()

    // Loop through active subscriptions
    for (const subscription of subscriptions.data) {
      // Step 1: Extract customer ID from subscription
      let customerId: string | null = null
      if (typeof subscription.customer === 'string') {
        customerId = subscription.customer // Use the customer ID directly
      } else if (
        typeof subscription.customer === 'object' &&
        subscription.customer !== null &&
        'id' in subscription.customer
      ) {
        customerId = (subscription.customer as Stripe.Customer).id // Extract ID from expanded customer object
      } else {
        console.warn('Customer ID not found for subscription:', subscription.id)
        continue
      }

      // Debug: Log the customer ID being processed
      console.log(`Processing subscription for customer ID: ${customerId}`)

      // Step 2: Fetch metadata from Redis
      const metadataKey = `setup_intent_metadata:${customerId}`
      const metadataFromRedis = await redis.get(metadataKey)

      if (!metadataFromRedis) {
        console.warn(
          `No metadata found in Redis for customer ID: ${customerId}`
        )
        continue
      }

      // Step 3: Parse metadata and retrieve the `studentKey`
      let parsedMetadata: { studentKey: string }
      if (typeof metadataFromRedis === 'string') {
        try {
          parsedMetadata = JSON.parse(metadataFromRedis)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          console.error(`❌ Failed to parse Redis metadata:`, metadataFromRedis)
          continue
        }
      } else if (typeof metadataFromRedis === 'object') {
        // If metadataFromRedis is already an object, use it directly
        parsedMetadata = metadataFromRedis as any
      } else {
        console.error(
          `❌ Unexpected type for metadataFromRedis:`,
          typeof metadataFromRedis
        )
        continue
      }

      const { studentKey } = parsedMetadata
      if (!studentKey) {
        console.warn(
          `Missing studentKey in metadata for customer ID: ${customerId}`
        )
        continue
      }

      // Debug: Log the studentKey being fetched
      console.log(`Fetching students from Redis using key: ${studentKey}`)

      // Step 4: Retrieve the student data from Redis using the `studentKey`
      const studentsFromRedis = await redis.get(studentKey)

      if (!studentsFromRedis) {
        console.warn(`No valid students found in Redis for key: ${studentKey}`)
        continue
      }

      // Step 5: Parse the student data and add their IDs to the Set
      let students: any[]
      if (typeof studentsFromRedis === 'string') {
        try {
          students = JSON.parse(studentsFromRedis)
        } catch (error) {
          console.error(
            `❌ Failed to parse student data from Redis:`,
            studentsFromRedis
          )
          throw new Error(
            `Failed to parse student data from Redis: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      } else if (typeof studentsFromRedis === 'object') {
        students = studentsFromRedis as any
      } else {
        console.error(
          `❌ Unexpected type for studentsFromRedis:`,
          typeof studentsFromRedis
        )
        continue
      }

      students.forEach((student: { id: string }) => {
        if (student.id) {
          enrolledStudentIds.add(student.id)
        }
      })
    }

    // Step 6: Convert Set to Array and log enrolled student IDs
    const enrolledStudentsArray = Array.from(enrolledStudentIds)
    console.log('Currently enrolled student IDs:', enrolledStudentsArray)

    // Return enrolled student IDs as JSON
    return NextResponse.json({
      enrolledStudents: enrolledStudentsArray,
    })
  } catch (error) {
    // Handle errors gracefully
    console.error('Error fetching enrolled students:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrolled students' },
      { status: 500 }
    )
  }
}
