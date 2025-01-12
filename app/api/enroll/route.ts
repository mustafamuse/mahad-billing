import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'
import { Student } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { total, email, firstName, lastName, phone, students } = body

    // 1️⃣ Create a unique key for storing the student data
    const redisKey = `students:${email}`

    // 2️⃣ Save the student data in Redis
    const stringifiedStudents = JSON.stringify(students)
    console.log('✅ Saving to Redis:', stringifiedStudents) // Debug before saving
    await redis.set(redisKey, stringifiedStudents, { ex: 86400 }) // TTL = 1 day

    console.log('✅ Students saved to Redis with key:', redisKey)

    // 3️⃣ Retrieve students from Redis to verify data storage
    // 3️⃣ Retrieve students from Redis to verify data storage
    const storedStudents = await redis.get(redisKey)
    console.log('✅ Retrieved from Redis:', storedStudents) // Debug after retrieving

    // Check if storedStudents is null or undefined
    if (!storedStudents) {
      throw new Error(
        `Failed to retrieve students from Redis for key: ${redisKey}`
      )
    }

    // Ensure storedStudents is in the correct format
    let parsedStudents: Student[]
    if (typeof storedStudents === 'string') {
      // If it's a string, parse it
      parsedStudents = JSON.parse(storedStudents) as Student[]
    } else if (Array.isArray(storedStudents)) {
      // If it's already an array, assign it directly
      parsedStudents = storedStudents as Student[]
    } else {
      // If it's neither a string nor an array, throw an error
      throw new Error(`Unexpected data format in Redis for key: ${redisKey}.`)
    }

    console.log('✅ Parsed students from Redis:', parsedStudents)

    // 4️⃣ Modify metadata to include only the reference key
    const customerData = {
      name: `${firstName} ${lastName}`,
      phone,
      metadata: {
        studentKey: redisKey, // Reference key for external data
        total: total.toString(),
      },
    }

    // 5️⃣ Find or create a Stripe Customer
    let customer = (await stripe.customers.list({ email, limit: 1 })).data[0]
    if (!customer) {
      customer = await stripe.customers.create({ email, ...customerData })
    } else {
      customer = await stripe.customers.update(customer.id, customerData)
    }

    console.log('API: Customer created/updated:', {
      id: customer.id,
      email,
      name: `${firstName} ${lastName}`,
      phone,
      total,
      students: parsedStudents.map((student) => student.name), // Retrieved from Redis
    })

    // 6️⃣ Create a SetupIntent with minimal metadata
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          verification_method: 'automatic',
          financial_connections: {
            permissions: ['payment_method'],
          },
        },
      },
      metadata: {
        studentKey: redisKey, // Reference to external data
        total: total.toString(),
        customerId: customer.id,
      },
    })

    // Save metadata to Redis for later retrieval
    // Save metadata to Redis for later retrieval
    const setupIntentMetadataKey = `setup_intent_metadata:${customer.id}`
    const setupIntentMetadata = {
      studentKey: redisKey,
      total: total.toString(),
      customerId: customer.id,
    }
    console.log(
      `Saving metadata to Redis with key: ${setupIntentMetadataKey}`,
      setupIntentMetadata
    )

    await redis.set(
      setupIntentMetadataKey,
      JSON.stringify(setupIntentMetadata),
      { ex: 86400 } // TTL: 1 day
    )

    console.log(
      `✅ Saved setup intent metadata to Redis with key: ${setupIntentMetadataKey}`
    )

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      setupIntent: setupIntent,
    })
  } catch (error) {
    console.error('Error creating SetupIntent:', error)
    return NextResponse.json(
      { error: 'Failed to create SetupIntent' },
      { status: 500 }
    )
  }
}
