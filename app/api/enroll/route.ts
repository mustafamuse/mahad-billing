import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { redis } from '@/lib/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    // Extract the Idempotency-Key from headers
    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Missing Idempotency-Key in headers' },
        { status: 400 }
      )
    }

    console.log('🔑 Received Idempotency-Key:', idempotencyKey)

    // Check if this key has already been processed
    const idempotencyCacheKey = `idempotency:${idempotencyKey}`
    const cachedResponse = await redis.get(idempotencyCacheKey)

    if (cachedResponse) {
      console.log('✅ Idempotency Key Found in Cache:', idempotencyKey)
      // Parse only if cachedResponse is a string
      const parsedResponse =
        typeof cachedResponse === 'string'
          ? JSON.parse(cachedResponse)
          : cachedResponse
      return NextResponse.json(parsedResponse)
    }

    console.log('ℹ️ Idempotency Key Not Found in Cache, proceeding...')

    const body = await request.json()
    const { total, email, firstName, lastName, phone, students } = body

    const redisKey = `students:${email}`
    const stringifiedStudents = JSON.stringify(students)

    await redis.set(redisKey, stringifiedStudents, { ex: 86400 })
    console.log('✅ Students saved to Redis with key:', redisKey)

    let customer = (await stripe.customers.list({ email, limit: 1 })).data[0]
    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        phone,
        metadata: {
          studentKey: redisKey,
          total: total.toString(),
        },
      })
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] },
        },
      },
      metadata: {
        studentKey: redisKey,
        total: total.toString(),
        customerId: customer.id,
      },
    })

    const responsePayload = {
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      setupIntent,
      studentKey: redisKey,
    }

    // Save metadata and response in Redis for idempotency
    const setupIntentMetadataKey = `setup_intent_metadata:${customer.id}`
    await redis.set(setupIntentMetadataKey, JSON.stringify(responsePayload), {
      ex: 86400,
    })

    // Cache the response for the Idempotency Key
    await redis.set(idempotencyCacheKey, JSON.stringify(responsePayload), {
      ex: 86400, // Cache for 1 day
    })

    console.log('✅ Cached response for Idempotency-Key:', idempotencyKey)

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    )
  }
}
