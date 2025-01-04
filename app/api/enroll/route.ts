import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { Student } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Creating customer:', {
      email: body.email,
      timestamp: new Date().toISOString(),
    })

    const { total, email, firstName, lastName, phone, students } = body

    const customerData = {
      name: `${firstName} ${lastName}`,
      phone,
      metadata: {
        students: JSON.stringify(students),
        total: total.toString(),
      },
    }

    // Find or create a Stripe Customer
    let customer = (await stripe.customers.list({ email: email, limit: 1 }))
      .data[0]

    if (!customer) {
      customer = await stripe.customers.create({
        email: email,
        ...customerData,
      })
    } else {
      customer = await stripe.customers.update(customer.id, customerData)
    }

    console.log('API: Customer created/updated:', {
      id: customer.id,
      email,
      name: `${firstName} ${lastName}`,
      phone,
      total,
      students: students.map((student: Student) => student.name),
    })

    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method', 'balances'],
          },
        },
      },
      metadata: {
        ...customerData.metadata,
        total: total.toString(),
        customerId: customer.id,
      },
    })

    console.log('🛠️ Debug: Created SetupIntent:', setupIntent)

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
