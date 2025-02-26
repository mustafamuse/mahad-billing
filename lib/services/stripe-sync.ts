import { SubscriptionStatus } from '@prisma/client'
import { kv } from '@vercel/kv'
import type { Stripe } from 'stripe'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'
import { StudentStatus } from '@/lib/types/student'

/**
 * Core synchronization function that ensures database consistency with Stripe
 * This function fetches the latest data from Stripe and updates the database accordingly
 */
export async function syncStripeDataToDatabase(
  customerId: string
): Promise<void> {
  console.log(`🔄 [STRIPE-SYNC] Starting sync for customer: ${customerId}`)

  // Fetch the payer from the database
  console.log(
    `🔍 [STRIPE-SYNC] Fetching payer with Stripe customer ID: ${customerId}`
  )
  let payer = await prisma.payer.findUnique({
    where: { stripeCustomerId: customerId },
    include: {
      students: true,
      subscriptions: true,
    },
  })

  if (!payer) {
    console.log(
      `⚠️ [STRIPE-SYNC] No payer found for Stripe customer ${customerId}, attempting to create one`
    )

    try {
      // Fetch customer details from Stripe
      const stripeCustomer =
        await stripeServerClient.customers.retrieve(customerId)

      // Check if customer is deleted
      if ((stripeCustomer as any).deleted) {
        console.error(
          `❌ [STRIPE-SYNC] Customer ${customerId} has been deleted in Stripe`
        )
        return
      }

      // Check if a payer with this email already exists
      const customerEmail = (stripeCustomer as Stripe.Customer).email
      if (customerEmail) {
        const existingPayer = await prisma.payer.findUnique({
          where: { email: customerEmail },
          include: {
            students: true,
            subscriptions: true,
          },
        })

        if (existingPayer) {
          console.log(
            `🔄 [STRIPE-SYNC] Found existing payer with email ${customerEmail}, updating with Stripe customer ID: ${customerId}`
          )

          // Update the existing payer with the Stripe customer ID
          payer = await prisma.payer.update({
            where: { id: existingPayer.id },
            data: { stripeCustomerId: customerId },
            include: {
              students: true,
              subscriptions: true,
            },
          })

          console.log(
            `✅ [STRIPE-SYNC] Updated existing payer: ${payer.id} with Stripe customer: ${customerId}`
          )

          // Return early since we found and updated an existing payer
          return
        }
      }

      // Only create a new payer if we didn't find an existing one
      console.log(
        `🔄 [STRIPE-SYNC] Creating new payer for customer: ${customerId}`
      )
      // Create a new payer record
      payer = await prisma.payer.create({
        data: {
          name: (stripeCustomer as Stripe.Customer).name || 'Unknown',
          email:
            (stripeCustomer as Stripe.Customer).email ||
            `unknown-${Date.now()}@example.com`,
          phone: (stripeCustomer as Stripe.Customer).phone || '',
          stripeCustomerId: customerId,
          relationship: 'Parent',
        },
        include: {
          students: true,
          subscriptions: true,
        },
      })

      console.log(
        `✅ [STRIPE-SYNC] Created new payer: ${payer.id} for Stripe customer: ${customerId}`
      )
    } catch (error) {
      console.error(
        `❌ [STRIPE-SYNC] Failed to create payer for Stripe customer ${customerId}:`,
        error
      )
      return
    }
  }

  // At this point, payer should be defined
  if (!payer) {
    console.error(
      `❌ [STRIPE-SYNC] Failed to find or create payer for customer ${customerId}`
    )
    return
  }

  console.log(`✅ [STRIPE-SYNC] Found payer: ${payer.name} (ID: ${payer.id})`)
  console.log(
    `👥 [STRIPE-SYNC] Payer has ${payer.students.length} students and ${payer.subscriptions.length} subscriptions`
  )

  // Fetch latest subscription data from Stripe
  console.log(
    `🔍 [STRIPE-SYNC] Fetching subscriptions from Stripe for customer: ${customerId}`
  )
  const stripeSubscriptions = await stripeServerClient.subscriptions.list({
    customer: customerId,
    status: 'all',
    expand: ['data.default_payment_method'],
  })

  console.log(
    `📊 [STRIPE-SYNC] Found ${stripeSubscriptions.data.length} subscriptions in Stripe for customer ${customerId}`
  )

  // Begin transaction to ensure database consistency
  console.log(
    `🔄 [STRIPE-SYNC] Starting database transaction for customer: ${customerId}`
  )
  await prisma.$transaction(async (tx) => {
    // Process each subscription
    for (const stripeSub of stripeSubscriptions.data) {
      console.log(
        `🔄 [STRIPE-SYNC] Processing Stripe subscription: ${stripeSub.id}`
      )
      console.log(`📝 [STRIPE-SYNC] Subscription status: ${stripeSub.status}`)
      console.log(`📝 [STRIPE-SYNC] Subscription metadata:`, stripeSub.metadata)

      // Find matching subscription in database or create new one
      let subscription = payer?.subscriptions.find(
        (sub) => sub.stripeSubscriptionId === stripeSub.id
      )

      // Map Stripe status to your enum
      const status = mapStripeStatusToDbStatus(stripeSub.status)
      console.log(
        `📝 [STRIPE-SYNC] Mapped status: ${stripeSub.status} -> ${status}`
      )

      if (subscription) {
        console.log(
          `🔄 [STRIPE-SYNC] Updating existing subscription: ${subscription.id}`
        )
        // Update existing subscription
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            lastPaymentDate:
              stripeSub.status === 'active' ? new Date() : undefined,
            nextPaymentDate: new Date(stripeSub.current_period_end * 1000),
            // Set grace period for past due subscriptions
            gracePeriodEndsAt:
              status === SubscriptionStatus.PAST_DUE
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days grace period
                : null,
          },
        })

        console.log(
          `✅ [STRIPE-SYNC] Updated subscription: ${subscription.id} with status: ${status}`
        )
      } else if (payer) {
        console.log(
          `🔄 [STRIPE-SYNC] Creating new subscription for Stripe subscription: ${stripeSub.id}`
        )
        // Create new subscription
        subscription = await tx.subscription.create({
          data: {
            stripeSubscriptionId: stripeSub.id,
            payerId: payer.id,
            status,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            lastPaymentDate:
              stripeSub.status === 'active' ? new Date() : undefined,
            nextPaymentDate: new Date(stripeSub.current_period_end * 1000),
            gracePeriodEndsAt:
              status === SubscriptionStatus.PAST_DUE
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                : null,
          },
        })

        console.log(
          `✅ [STRIPE-SYNC] Created new subscription: ${subscription.id} with status: ${status}`
        )
      } else {
        console.log(
          `❌ [STRIPE-SYNC] Cannot create subscription: No valid payer found for customer ${customerId}`
        )
        continue
      }

      // Update students linked to this subscription
      // Extract studentIds from metadata
      console.log(
        `🔍 [STRIPE-SYNC] Checking for student IDs in subscription metadata`
      )
      const studentIds = stripeSub.metadata.studentIds
        ? JSON.parse(stripeSub.metadata.studentIds)
        : []

      if (studentIds.length === 0 && stripeSub.metadata.studentId) {
        // Handle case where studentId is stored directly in metadata
        console.log(
          `🔍 [STRIPE-SYNC] Found single studentId in metadata: ${stripeSub.metadata.studentId}`
        )
        studentIds.push(stripeSub.metadata.studentId)
      }

      if (studentIds.length > 0 && payer) {
        console.log(
          `👥 [STRIPE-SYNC] Updating ${studentIds.length} students: ${studentIds.join(', ')}`
        )
        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: {
            payerId: payer.id,
            status:
              stripeSub.status === 'active'
                ? StudentStatus.ENROLLED
                : StudentStatus.REGISTERED,
            lastPaymentDate:
              stripeSub.status === 'active' ? new Date() : undefined,
            nextPaymentDue: new Date(stripeSub.current_period_end * 1000),
          },
        })

        console.log(
          `✅ [STRIPE-SYNC] Updated ${studentIds.length} students linked to subscription with status: ${
            stripeSub.status === 'active'
              ? StudentStatus.ENROLLED
              : StudentStatus.REGISTERED
          }`
        )
      } else {
        console.log(
          `⚠️ [STRIPE-SYNC] No student IDs found in subscription metadata or no valid payer`
        )
      }
    }

    // Handle case where subscriptions were deleted in Stripe
    const activeStripeSubIds = stripeSubscriptions.data.map((sub) => sub.id)
    const deletedSubscriptions =
      payer?.subscriptions.filter(
        (sub) => !activeStripeSubIds.includes(sub.stripeSubscriptionId)
      ) || []

    if (deletedSubscriptions.length > 0) {
      console.log(
        `🔍 [STRIPE-SYNC] Found ${deletedSubscriptions.length} subscriptions to mark as canceled`
      )
    }

    for (const deletedSub of deletedSubscriptions) {
      console.log(
        `🔄 [STRIPE-SYNC] Marking subscription as canceled: ${deletedSub.id}`
      )
      await tx.subscription.update({
        where: { id: deletedSub.id },
        data: { status: SubscriptionStatus.CANCELED },
      })

      console.log(
        `✅ [STRIPE-SYNC] Marked subscription as canceled: ${deletedSub.id}`
      )
    }
  })

  console.log(`✅ [STRIPE-SYNC] Sync completed for customer: ${customerId}`)
}

/**
 * Maps Stripe subscription status to database enum
 */
function mapStripeStatusToDbStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'past_due':
      return SubscriptionStatus.PAST_DUE
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'unpaid':
      return SubscriptionStatus.INACTIVE
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.INCOMPLETE
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'paused':
      return SubscriptionStatus.INACTIVE
    default:
      return SubscriptionStatus.INCOMPLETE
  }
}

/**
 * Checks if a webhook event has already been processed
 * Uses Redis for idempotency tracking
 */
export async function isWebhookEventProcessed(
  eventId: string
): Promise<boolean> {
  console.log(
    `🔍 [STRIPE-SYNC] Checking if webhook event has been processed: ${eventId}`
  )
  const key = `stripe:webhook:${eventId}`
  const data = await kv.get(key)
  const isProcessed = !!data
  console.log(
    `📝 [STRIPE-SYNC] Webhook event ${eventId} processed: ${isProcessed}`
  )
  return isProcessed
}

/**
 * Marks a webhook event as processed
 * Uses Redis for idempotency tracking
 */
export async function markWebhookEventProcessed(
  eventId: string,
  eventType: string,
  customerId?: string
): Promise<void> {
  console.log(
    `🔄 [STRIPE-SYNC] Marking webhook event as processed: ${eventId} (${eventType})`
  )
  const key = `stripe:webhook:${eventId}`
  const data = {
    processedAt: new Date().toISOString(),
    eventType,
    customerId,
  }

  // Store with expiration (30 days)
  await kv.set(key, JSON.stringify(data), { ex: 60 * 60 * 24 * 30 })
  console.log(`✅ [STRIPE-SYNC] Marked webhook event as processed: ${eventId}`)
}

/**
 * Extract customerId from Stripe event
 */
export function extractCustomerId(event: Stripe.Event): string | undefined {
  const object = event.data.object as any

  if (object.customer) {
    return typeof object.customer === 'string'
      ? object.customer
      : object.customer.id
  }

  return undefined
}

/**
 * Handles ACH-specific payment intent states
 */
export async function handleACHPaymentIntent(
  event: Stripe.Event
): Promise<void> {
  console.log(`🔄 [STRIPE-SYNC] Handling ACH payment intent: ${event.id}`)
  const paymentIntent = event.data.object as Stripe.PaymentIntent

  // Check if this is an ACH payment
  if (!paymentIntent.payment_method_types.includes('us_bank_account')) {
    console.log(
      `⚠️ [STRIPE-SYNC] Not an ACH payment, skipping: ${paymentIntent.id}`
    )
    return // Not an ACH payment
  }

  console.log(`✅ [STRIPE-SYNC] Confirmed ACH payment: ${paymentIntent.id}`)
  console.log(`📝 [STRIPE-SYNC] Payment status: ${paymentIntent.status}`)
  console.log(
    `📝 [STRIPE-SYNC] Payment amount: ${paymentIntent.amount / 100} USD`
  )
  console.log(`📝 [STRIPE-SYNC] Payment metadata:`, paymentIntent.metadata)

  const customerId = paymentIntent.customer as string

  if (!customerId) {
    console.error(
      `❌ [STRIPE-SYNC] No customer ID found in payment intent: ${paymentIntent.id}`
    )
    return
  }

  console.log(
    `👤 [STRIPE-SYNC] Processing ACH payment for customer: ${customerId}`
  )

  // Sync data to ensure we have the latest state
  await syncStripeDataToDatabase(customerId)

  console.log(
    `✅ [STRIPE-SYNC] Processed ACH payment intent: ${paymentIntent.id} with status: ${paymentIntent.status}`
  )
}
