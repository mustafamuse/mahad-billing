import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { z } from 'zod'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'

// Validation schema for the request body
const createPaymentLinkSchema = z.object({
  students: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      monthlyRate: z.number().positive(),
    })
  ),
  amount: z.number().positive(),
  customFields: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(['text', 'numeric', 'dropdown']),
        optional: z.boolean().optional(),
        options: z
          .array(
            z.object({
              label: z.string(),
              value: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
})

export async function POST(req: Request) {
  console.log('🚀 [PAYMENT-LINK] Starting payment link creation process')
  try {
    // Parse and validate the request body
    const body = await req.json()
    console.log(
      '📝 [PAYMENT-LINK] Request body:',
      JSON.stringify(body, null, 2)
    )

    const {
      students,
      amount,
      customFields: _customFields,
    } = createPaymentLinkSchema.parse(body)

    if (students.length === 0) {
      console.error('❌ [PAYMENT-LINK] No students provided in request')
      return NextResponse.json(
        { error: 'At least one student is required' },
        { status: 400 }
      )
    }

    console.log(
      `✅ [PAYMENT-LINK] Validated request with ${students.length} students and amount ${amount / 100} USD`
    )

    // Get the primary student (first in the array)
    const primaryStudentId = students[0].id

    // Fetch all selected students from the database to get their complete information
    const selectedStudents = await prisma.student.findMany({
      where: {
        id: {
          in: students.map((s) => s.id),
        },
      },
      include: {
        siblingGroup: {
          select: {
            id: true,
          },
        },
      },
    })

    console.log(
      `📊 [PAYMENT-LINK] Found ${selectedStudents.length} students in database`
    )

    if (selectedStudents.length !== students.length) {
      console.error('❌ [PAYMENT-LINK] Some students not found in database')
      return NextResponse.json(
        { error: 'One or more students not found' },
        { status: 404 }
      )
    }

    // Get the existing product ID from environment variables
    const productId = process.env.STRIPE_PRODUCT_ID

    if (!productId) {
      console.error(
        '❌ [PAYMENT-LINK] STRIPE_PRODUCT_ID is not defined in environment variables'
      )
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    console.log(`🔑 [PAYMENT-LINK] Using product ID: ${productId}`)

    // Create a recurring price for the product
    console.log(
      `💰 [PAYMENT-LINK] Creating price with amount: ${amount} cents (${amount / 100} USD)`
    )
    const price = await stripeServerClient.prices.create({
      product: productId,
      unit_amount: amount, // Amount in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        studentIds: JSON.stringify(students.map((s) => s.id)),
        studentNames: students.map((s) => s.name).join(', '),
        totalMonthlyRate: amount / 100, // Convert back to dollars for readability
      },
    })

    console.log(
      `✅ [PAYMENT-LINK] Created price: ${price.id} for ${amount / 100} USD monthly`
    )

    // Get base URL for redirect
    const headersList = headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

    console.log(`🔗 [PAYMENT-LINK] Using base URL for redirect: ${baseUrl}`)

    // Prepare payment link creation parameters
    const paymentLinkParams: any = {
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/payment-success?studentId=${primaryStudentId}`,
        },
      },
      metadata: {
        studentIds: JSON.stringify(students.map((s) => s.id)),
        studentNames: students.map((s) => s.name).join(', '),
        studentRates: JSON.stringify(students.map((s) => s.monthlyRate)),
        paymentType: 'subscription',
        createdAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
      },
      subscription_data: {
        metadata: {
          studentIds: JSON.stringify(students.map((s) => s.id)),
          studentNames: students.map((s) => s.name).join(', '),
          studentRates: JSON.stringify(students.map((s) => s.monthlyRate)),
          totalMonthlyRate: amount / 100, // Convert back to dollars for readability
          createdAt: new Date().toISOString(),
          source: 'payment_link',
          environment: process.env.NODE_ENV,
        },
        description:
          students.length === 1
            ? `Monthly tuition for ${students[0].name}`
            : `Monthly tuition for ${students.length} students`,
      },
      automatic_tax: { enabled: false },
    }

    // Check if all students belong to the same sibling group
    const siblingGroupIds = selectedStudents
      .map((s) => s.siblingGroupId)
      .filter(Boolean)

    const uniqueSiblingGroups = Array.from(new Set(siblingGroupIds))

    if (uniqueSiblingGroups.length === 1 && uniqueSiblingGroups[0]) {
      // All students belong to the same sibling group
      console.log(
        `👨‍👩‍👧‍👦 [PAYMENT-LINK] All students belong to sibling group: ${uniqueSiblingGroups[0]}`
      )
      paymentLinkParams.metadata.siblingGroupId = uniqueSiblingGroups[0]
      paymentLinkParams.subscription_data.metadata.siblingGroupId =
        uniqueSiblingGroups[0]
    }

    // Remove any Connect-related parameters that might be causing issues
    if (paymentLinkParams.transfer_data) {
      console.log('🔄 [PAYMENT-LINK] Removing transfer_data parameter')
      delete paymentLinkParams.transfer_data
    }

    console.log(
      '📝 [PAYMENT-LINK] Creating payment link with params:',
      JSON.stringify(
        {
          ...paymentLinkParams,
          line_items: paymentLinkParams.line_items,
          metadata: {
            ...paymentLinkParams.metadata,
            studentIds: JSON.parse(paymentLinkParams.metadata.studentIds),
          },
          subscription_data: {
            ...paymentLinkParams.subscription_data,
            metadata: {
              ...paymentLinkParams.subscription_data.metadata,
              studentIds: JSON.parse(
                paymentLinkParams.subscription_data.metadata.studentIds
              ),
              studentRates: JSON.parse(
                paymentLinkParams.subscription_data.metadata.studentRates
              ),
            },
          },
        },
        null,
        2
      )
    )

    // Create a payment link in Stripe using the price ID for a recurring subscription
    const paymentLink =
      await stripeServerClient.paymentLinks.create(paymentLinkParams)

    console.log(
      `🎉 [PAYMENT-LINK] Successfully created payment link: ${paymentLink.id}`
    )
    console.log(`🔗 [PAYMENT-LINK] Payment link URL: ${paymentLink.url}`)

    // Return the payment link URL
    return NextResponse.json({
      success: true,
      url: paymentLink.url,
      id: paymentLink.id,
    })
  } catch (error) {
    console.error('❌ [PAYMENT-LINK] Error creating payment link:', error)

    if (error instanceof z.ZodError) {
      console.error(
        '❌ [PAYMENT-LINK] Validation error:',
        JSON.stringify(error.errors, null, 2)
      )
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
