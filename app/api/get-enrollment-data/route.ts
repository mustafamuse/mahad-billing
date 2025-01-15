import { NextResponse } from 'next/server'

import { redis } from '@/lib/redis'
import { Student } from '@/lib/types'
import { stripeServerClient } from '@/lib/utils/stripe'

interface FormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  total: string
}

interface EnrollmentData {
  formValues: FormValues
  students: Student[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const setupIntentId = searchParams.get('setupIntentId')

    if (!setupIntentId) {
      return NextResponse.json(
        { error: 'setupIntentId is required' },
        { status: 400 }
      )
    }

    // Get the SetupIntent from Stripe to get the metadata
    const setupIntent =
      await stripeServerClient.setupIntents.retrieve(setupIntentId)
    if (!setupIntent.metadata?.studentKey) {
      throw new Error('No student key found in SetupIntent metadata')
    }

    // Get the student data from Redis
    const studentsData = await redis.get(setupIntent.metadata.studentKey)
    if (!studentsData) {
      throw new Error('No student data found in Redis')
    }

    // Parse the students data
    const students =
      typeof studentsData === 'string'
        ? (JSON.parse(studentsData) as Student[])
        : (studentsData as Student[])

    // Get the customer details from Stripe
    const customer = await stripeServerClient.customers.retrieve(
      setupIntent.customer as string
    )

    // Handle customer name parsing more safely
    let firstName = ''
    let lastName = ''
    if (customer.name) {
      const nameParts = customer.name.trim().split(/\s+/)
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
    }

    const formValues: FormValues = {
      firstName,
      lastName,
      email: customer.email || '',
      phone: customer.phone || '',
      total: setupIntent.metadata.total || '0',
    }

    const enrollmentData: EnrollmentData = {
      formValues,
      students,
    }

    return NextResponse.json(enrollmentData)
  } catch (error) {
    console.error('Error retrieving enrollment data:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve enrollment data' },
      { status: 500 }
    )
  }
}
