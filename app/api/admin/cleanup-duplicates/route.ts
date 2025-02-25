import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'

// This endpoint requires admin authentication
export async function GET(req: Request) {
  try {
    // Check for admin authorization (implement your auth check here)
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const url = new URL(req.url)
    const email = url.searchParams.get('email')
    const action = url.searchParams.get('action') || 'scan'

    // If email is provided, look for duplicates for that specific email
    if (email) {
      return await handleEmailDuplicates(email, action === 'fix')
    }

    // Otherwise, scan for all potential duplicates
    return await scanForDuplicates()
  } catch (error) {
    console.error('Error in cleanup-duplicates endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

async function scanForDuplicates() {
  // Find all payers in our database
  const payers = await prisma.payer.findMany({
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
      createdAt: true,
      students: {
        select: {
          id: true,
          name: true,
        },
      },
      subscriptions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  })

  // Group payers by email to find duplicates
  const payersByEmail: Record<
    string,
    {
      id: string
      email: string
      stripeCustomerId: string
      createdAt: Date
      students: { id: string; name: string }[]
      subscriptions: { id: string; status: string }[]
    }[]
  > = {}

  payers.forEach((payer) => {
    if (!payersByEmail[payer.email]) {
      payersByEmail[payer.email] = []
    }
    payersByEmail[payer.email].push(payer)
  })

  // Filter to only emails with multiple payers
  const duplicateEmails = Object.entries(payersByEmail)
    .filter(([_, payers]) => payers.length > 1)
    .map(([email, payers]) => ({
      email,
      count: payers.length,
      payers: payers.map((p) => ({
        id: p.id,
        stripeCustomerId: p.stripeCustomerId,
        createdAt: p.createdAt,
        studentCount: p.students.length,
        subscriptionCount: p.subscriptions.length,
        hasActiveSubscription: p.subscriptions.some(
          (s) => s.status === 'ACTIVE'
        ),
      })),
    }))

  return NextResponse.json({
    totalPayers: payers.length,
    duplicateEmailCount: duplicateEmails.length,
    duplicates: duplicateEmails,
  })
}

async function handleEmailDuplicates(email: string, shouldFix: boolean) {
  // Find all payers with this email
  const payers = await prisma.payer.findMany({
    where: { email },
    include: {
      students: true,
      subscriptions: true,
    },
  })

  if (payers.length <= 1) {
    return NextResponse.json({
      message: 'No duplicates found for this email',
      email,
      payerCount: payers.length,
    })
  }

  // Check Stripe for customers with this email
  const stripeCustomers = await stripeServerClient.customers.list({
    email,
    limit: 100,
  })

  // If we're just scanning, return the data
  if (!shouldFix) {
    return NextResponse.json({
      email,
      payersInDatabase: payers.map((p) => ({
        id: p.id,
        stripeCustomerId: p.stripeCustomerId,
        createdAt: p.createdAt,
        studentCount: p.students.length,
        subscriptionCount: p.subscriptions.length,
        hasActiveSubscription: p.subscriptions.some(
          (s) => s.status === 'ACTIVE'
        ),
      })),
      customersInStripe: stripeCustomers.data.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        created: new Date(c.created * 1000).toISOString(),
        metadata: c.metadata,
      })),
    })
  }

  // If we're fixing, implement the fix logic
  // This is a complex operation that requires careful handling
  // Here's a basic implementation that should be reviewed before use

  // 1. Find the "primary" payer (the one with active subscriptions or most students)
  const primaryPayer = payers.slice().sort((a, b) => {
    // First, prioritize payers with active subscriptions
    const aHasActive = a.subscriptions.some((s) => s.status === 'ACTIVE')
    const bHasActive = b.subscriptions.some((s) => s.status === 'ACTIVE')

    if (aHasActive && !bHasActive) return -1
    if (!aHasActive && bHasActive) return 1

    // Then, prioritize payers with more students
    return b.students.length - a.students.length
  })[0]

  if (!primaryPayer) {
    return NextResponse.json(
      {
        error: 'Could not determine primary payer',
        email,
      },
      { status: 400 }
    )
  }

  // 2. Verify the primary payer's Stripe customer exists
  try {
    const _primaryStripeCustomer = await stripeServerClient.customers.retrieve(
      primaryPayer.stripeCustomerId
    )
    // Just checking if it exists and doesn't throw an error
  } catch (error) {
    return NextResponse.json(
      {
        error: "Primary payer's Stripe customer not found",
        email,
        payerId: primaryPayer.id,
        stripeCustomerId: primaryPayer.stripeCustomerId,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    )
  }

  // 3. Move all students to the primary payer
  const secondaryPayers = payers.filter((p) => p.id !== primaryPayer.id)

  const results = await prisma.$transaction(async (tx) => {
    const updates = []

    // Update all students from secondary payers to point to primary payer
    for (const payer of secondaryPayers) {
      if (payer.students.length > 0) {
        const update = await tx.student.updateMany({
          where: { payerId: payer.id },
          data: { payerId: primaryPayer.id },
        })
        updates.push({
          payerId: payer.id,
          studentsUpdated: update.count,
        })
      }
    }

    return updates
  })

  return NextResponse.json({
    message: 'Duplicates consolidated',
    email,
    primaryPayer: {
      id: primaryPayer.id,
      stripeCustomerId: primaryPayer.stripeCustomerId,
    },
    updates: results,
    nextSteps: [
      'Review the changes in the database',
      'Delete the secondary Stripe customers manually if needed',
      'Update any secondary payers in the database as needed',
    ],
  })
}

export const dynamic = 'force-dynamic'
