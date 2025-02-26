# Stripe ACH Payment Integration Guide

## Overview

This document outlines a comprehensive approach to integrating Stripe's ACH payment processing into your application, based on your existing database schema and application architecture. The design follows best practices recommended by Theo Browne's "Stripe Recommendations" while adapting them to your specific needs for ACH payments.

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Database Schema Considerations](#database-schema-considerations)
3. [Implementation Architecture](#implementation-architecture)
4. [Customer Management](#customer-management)
5. [Subscription Synchronization](#subscription-synchronization)
6. [Webhook Processing](#webhook-processing)
7. [ACH-Specific Considerations](#ach-specific-considerations)
8. [Error Handling and Recovery](#error-handling-and-recovery)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Considerations](#deployment-considerations)
11. [Code Examples](#code-examples)

## Core Philosophy

The fundamental principle of this implementation is to avoid the "split brain" problem that commonly occurs with Stripe integrations. This is achieved by:

1. **Single Source of Truth**: Implementing a robust synchronization mechanism between Stripe and your database.
2. **Consistent State Management**: Using transactions to ensure database consistency.
3. **Proactive Synchronization**: Syncing data at critical points in the user journey, not just relying on webhooks.
4. **Idempotent Operations**: Ensuring operations can be safely retried without side effects.

## Database Schema Considerations

Your existing schema is well-structured for Stripe integration, with the following models being particularly relevant:

- `Payer`: Represents the customer who makes payments
- `Student`: Represents the beneficiary of the subscription
- `Subscription`: Tracks the subscription state

### Recommended Schema Enhancements

```prisma
model Payer {
  // Existing fields
  stripeCustomerId String         @unique
  isActive         Boolean        @default(true)

  // Add indexes for faster lookups
  @@index([stripeCustomerId])
  @@index([email, stripeCustomerId])
}

model Subscription {
  id                   String             @id @default(uuid())
  stripeSubscriptionId String             @unique
  payerId              String
  status               SubscriptionStatus @default(ACTIVE)

  // Add fields for ACH-specific tracking
  paymentMethodType    String?            // "us_bank_account", "card", etc.
  paymentMethodLast4   String?            // Last 4 of account number
  paymentMethodBankName String?           // Bank name for ACH
  processingStartedAt  DateTime?          // When ACH processing began
  estimatedSettlementDate DateTime?       // Expected settlement date

  // Existing fields
  lastPaymentDate      DateTime?
  nextPaymentDate      DateTime?
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  paymentRetryCount    Int                @default(0)
  lastPaymentError     String?
  gracePeriodEndsAt    DateTime?

  // Relations
  payer                Payer              @relation(fields: [payerId], references: [id])

  // Indexes
  @@index([status])
  @@index([payerId])
  @@index([stripeSubscriptionId])
}

// Add a new model to track webhook events for idempotency
model StripeWebhookEvent {
  id            String    @id // Stripe event ID
  type          String
  processedAt   DateTime  @default(now())
  customerId    String?
  data          Json

  @@index([customerId])
  @@index([type])
}
```

## Implementation Architecture

The implementation follows a layered architecture:

1. **API Layer**: Handles HTTP requests and responses
2. **Service Layer**: Contains business logic for Stripe operations
3. **Data Access Layer**: Manages database operations
4. **Webhook Handler**: Processes Stripe events

### Key Components

- **Customer Binding Service**: Maps Stripe customers to your users
- **Sync Service**: Synchronizes Stripe data with your database
- **Webhook Processor**: Handles Stripe events
- **Payment Flow Controller**: Manages the payment process

## Customer Management

### Creating and Retrieving Customers

Always create or retrieve a Stripe customer before initiating checkout:

```typescript
async function getOrCreateStripeCustomer(payerDetails, studentIds) {
  // Check if payer already exists in your database
  let payer = await prisma.payer.findFirst({
    where: { email: payerDetails.email },
  })

  // If payer exists and has a Stripe customer ID, verify it still exists in Stripe
  if (payer?.stripeCustomerId) {
    try {
      const customer = await stripeServerClient.customers.retrieve(
        payer.stripeCustomerId
      )
      if (!('deleted' in customer && customer.deleted)) {
        return {
          customerId: payer.stripeCustomerId,
          payerId: payer.id,
          isNew: false,
        }
      }
    } catch (error) {
      // Customer doesn't exist in Stripe anymore
    }
  }

  // Create new customer in Stripe
  const customer = await stripeServerClient.customers.create({
    name: `${payerDetails.firstName} ${payerDetails.lastName}`,
    email: payerDetails.email,
    phone: payerDetails.phone,
    metadata: {
      relationship: payerDetails.relationship,
      studentIds: JSON.stringify(studentIds),
      createdAt: new Date().toISOString(),
    },
  })

  // Create or update payer in database
  if (!payer) {
    payer = await prisma.payer.create({
      data: {
        name: `${payerDetails.firstName} ${payerDetails.lastName}`,
        email: payerDetails.email,
        phone: payerDetails.phone,
        stripeCustomerId: customer.id,
        relationship: payerDetails.relationship,
      },
    })
  } else {
    payer = await prisma.payer.update({
      where: { id: payer.id },
      data: { stripeCustomerId: customer.id },
    })
  }

  return { customerId: customer.id, payerId: payer.id, isNew: true }
}
```

## Subscription Synchronization

The core of the implementation is the synchronization function that keeps your database in sync with Stripe:

```typescript
async function syncStripeDataToDatabase(customerId) {
  // Fetch the payer from your database
  const payer = await prisma.payer.findUnique({
    where: { stripeCustomerId: customerId },
    include: {
      students: true,
      subscriptions: true,
    },
  })

  if (!payer) {
    console.error(`No payer found for Stripe customer ${customerId}`)
    return
  }

  // Fetch latest subscription data from Stripe
  const stripeSubscriptions = await stripeServerClient.subscriptions.list({
    customer: customerId,
    status: 'all',
    expand: ['data.default_payment_method'],
  })

  // Begin transaction to ensure database consistency
  await prisma.$transaction(async (tx) => {
    // Process each subscription
    for (const stripeSub of stripeSubscriptions.data) {
      // Find matching subscription in database or create new one
      let subscription = payer.subscriptions.find(
        (sub) => sub.stripeSubscriptionId === stripeSub.id
      )

      // Map Stripe status to your enum
      const status = mapStripeStatusToDbStatus(stripeSub.status)

      // Extract payment method details if available
      let paymentMethodDetails = null
      if (
        stripeSub.default_payment_method &&
        typeof stripeSub.default_payment_method !== 'string'
      ) {
        if (stripeSub.default_payment_method.type === 'us_bank_account') {
          const bankAccount = stripeSub.default_payment_method.us_bank_account
          paymentMethodDetails = {
            type: 'us_bank_account',
            last4: bankAccount?.last4 || null,
            bankName: bankAccount?.bank_name || null,
          }
        }
      }

      if (subscription) {
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
            paymentMethodType: paymentMethodDetails?.type || null,
            paymentMethodLast4: paymentMethodDetails?.last4 || null,
            paymentMethodBankName: paymentMethodDetails?.bankName || null,
          },
        })
      } else {
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
            paymentMethodType: paymentMethodDetails?.type || null,
            paymentMethodLast4: paymentMethodDetails?.last4 || null,
            paymentMethodBankName: paymentMethodDetails?.bankName || null,
          },
        })
      }

      // Update students linked to this subscription
      // Extract studentIds from metadata
      const studentIds = stripeSub.metadata.studentIds
        ? JSON.parse(stripeSub.metadata.studentIds)
        : []

      if (studentIds.length > 0) {
        await tx.student.updateMany({
          where: { id: { in: studentIds } },
          data: {
            payerId: payer.id,
            lastPaymentDate:
              stripeSub.status === 'active' ? new Date() : undefined,
            nextPaymentDue: new Date(stripeSub.current_period_end * 1000),
          },
        })
      }
    }

    // Handle case where subscriptions were deleted in Stripe
    const activeStripeSubIds = stripeSubscriptions.data.map((sub) => sub.id)
    const deletedSubscriptions = payer.subscriptions.filter(
      (sub) => !activeStripeSubIds.includes(sub.stripeSubscriptionId)
    )

    for (const deletedSub of deletedSubscriptions) {
      await tx.subscription.update({
        where: { id: deletedSub.id },
        data: { status: 'CANCELED' },
      })
    }
  })
}
```

## Webhook Processing

Webhooks are critical for keeping your database in sync with Stripe. Here's how to handle them:

```typescript
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    // Verify webhook signature
    const event = stripeServerClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    // Check if we've already processed this event
    const existingEvent = await prisma.stripeWebhookEvent.findUnique({
      where: { id: event.id },
    })

    if (existingEvent) {
      // Already processed this event
      return NextResponse.json({ received: true })
    }

    // Process event asynchronously
    processStripeEvent(event).catch((error) => {
      console.error('Error processing webhook:', error)
    })

    // Store event to prevent duplicate processing
    await prisma.stripeWebhookEvent.create({
      data: {
        id: event.id,
        type: event.type,
        customerId: extractCustomerId(event),
        data: event.data.object as any,
      },
    })

    // Return 200 immediately to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }
}

// Helper to extract customerId from event
function extractCustomerId(event: Stripe.Event): string | null {
  const object = event.data.object as any

  if (object.customer) {
    return typeof object.customer === 'string'
      ? object.customer
      : object.customer.id
  }

  return null
}
```

### Critical Events to Track

For ACH payments, these events are particularly important:

```typescript
const TRACKED_EVENTS = [
  // Checkout and subscription lifecycle
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',

  // Invoice events
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.payment_action_required',

  // Payment intent events (critical for ACH)
  'payment_intent.succeeded',
  'payment_intent.processing',
  'payment_intent.payment_failed',
  'payment_intent.canceled',

  // Charge events (also important for ACH)
  'charge.succeeded',
  'charge.failed',
  'charge.pending',
]
```

## ACH-Specific Considerations

ACH payments have unique characteristics that require special handling:

1. **Processing Time**: ACH payments can take 3-5 business days to process
2. **Status Tracking**: Need to track the payment through processing → succeeded flow
3. **Error Handling**: ACH payments can fail for various reasons (insufficient funds, account closed, etc.)

### Handling ACH Payment States

```typescript
async function handleACHPaymentIntent(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent

  if (!paymentIntent.payment_method_types.includes('us_bank_account')) {
    return // Not an ACH payment
  }

  // Find the subscription associated with this payment
  const subscription = await prisma.subscription.findFirst({
    where: {
      payer: {
        stripeCustomerId: paymentIntent.customer as string,
      },
    },
  })

  if (!subscription) {
    console.error('No subscription found for payment intent:', paymentIntent.id)
    return
  }

  switch (paymentIntent.status) {
    case 'processing':
      // ACH payment is processing
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          processingStartedAt: new Date(),
          // Estimate settlement date (3-5 business days)
          estimatedSettlementDate: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000
          ),
          lastPaymentError: 'ACH payment in processing state',
        },
      })
      break

    case 'succeeded':
      // Payment completed successfully
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          lastPaymentDate: new Date(),
          lastPaymentError: null,
          paymentRetryCount: 0, // Reset retry count on success
          processingStartedAt: null,
          estimatedSettlementDate: null,
        },
      })
      break

    case 'requires_payment_method':
      // Payment failed
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'PAST_DUE',
          lastPaymentError:
            paymentIntent.last_payment_error?.message || 'ACH payment failed',
          paymentRetryCount: { increment: 1 },
          // Set grace period
          gracePeriodEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          processingStartedAt: null,
          estimatedSettlementDate: null,
        },
      })
      break
  }
}
```

## Error Handling and Recovery

Robust error handling is critical for a payment system:

1. **Retry Mechanism**: Implement exponential backoff for failed operations
2. **Logging**: Log all errors with context for debugging
3. **Monitoring**: Set up alerts for critical failures
4. **Recovery**: Implement a way to manually sync data if needed

```typescript
// Example of a manual sync endpoint for recovery
export async function POST(req: Request) {
  const { customerId } = await req.json()

  try {
    await syncStripeDataToDatabase(customerId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Manual sync failed:', error)
    return NextResponse.json({ error: 'Failed to sync data' }, { status: 500 })
  }
}
```

## Testing Strategy

Testing a payment integration requires a comprehensive approach:

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test the interaction between your app and Stripe
3. **Webhook Tests**: Test webhook handling with mock events
4. **End-to-End Tests**: Test the complete payment flow

### Testing Webhooks

Stripe provides a CLI tool for testing webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

## Deployment Considerations

When deploying your Stripe integration:

1. **Environment Variables**: Securely manage Stripe API keys
2. **Webhook Endpoints**: Configure webhook endpoints for each environment
3. **Error Monitoring**: Set up error monitoring and alerting
4. **Logging**: Implement comprehensive logging for debugging
5. **Database Migrations**: Plan for schema changes

## Code Examples

### Complete Webhook Handler

```typescript
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    // Verify webhook signature
    const event = stripeServerClient.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    // Check if we've already processed this event
    const existingEvent = await prisma.stripeWebhookEvent.findUnique({
      where: { id: event.id },
    })

    if (existingEvent) {
      // Already processed this event
      return NextResponse.json({ received: true })
    }

    // Extract customerId from the event
    const customerId = extractCustomerId(event)

    if (!customerId) {
      console.error('No customer ID found in event:', event.type)
      return NextResponse.json({ received: true })
    }

    // Store event to prevent duplicate processing
    await prisma.stripeWebhookEvent.create({
      data: {
        id: event.id,
        type: event.type,
        customerId,
        data: event.data.object as any,
      },
    })

    // Process different event types
    if (TRACKED_EVENTS.includes(event.type)) {
      // Sync data to database
      await syncStripeDataToDatabase(customerId)

      // Handle specific events
      switch (event.type) {
        case 'payment_intent.processing':
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
          await handleACHPaymentIntent(event)
          break

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event)
          break

        // Add other specific handlers as needed
      }
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
```

### Payment Link Creation

```typescript
export async function POST(req: Request) {
  try {
    // Parse and validate the request body
    const { studentId, amount } = createPaymentLinkSchema.parse(
      await req.json()
    )

    // Fetch the student from the database
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        siblingGroup: {
          include: {
            students: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get or create a Stripe customer for this student
    let stripeCustomerId

    if (student.payerId) {
      // If student has a payer, use their Stripe customer ID
      const payer = await prisma.payer.findUnique({
        where: { id: student.payerId },
      })

      if (payer?.stripeCustomerId) {
        stripeCustomerId = payer.stripeCustomerId
      }
    }

    // If no Stripe customer ID found, create a new one
    if (!stripeCustomerId) {
      const customer = await stripeServerClient.customers.create({
        name: student.name,
        email: student.email || undefined,
        metadata: {
          studentId: student.id,
          studentName: student.name,
          createdAt: new Date().toISOString(),
        },
      })

      stripeCustomerId = customer.id

      // If student has no payer, create one
      if (!student.payerId) {
        const payer = await prisma.payer.create({
          data: {
            name: student.name,
            email: student.email || `student-${student.id}@example.com`,
            phone: student.phone || '',
            stripeCustomerId,
          },
        })

        // Update student with new payer
        await prisma.student.update({
          where: { id: student.id },
          data: { payerId: payer.id },
        })
      }
    }

    // Create a recurring price for the product
    const price = await stripeServerClient.prices.create({
      product: process.env.STRIPE_PRODUCT_ID!,
      unit_amount: amount, // Amount in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      metadata: {
        studentId: student.id,
        studentName: student.name,
        monthlyRate: amount / 100, // Convert back to dollars for readability
        siblingGroupId: student.siblingGroupId || '',
      },
    })

    // Get base URL for redirect
    const headersList = headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

    // Create payment link
    const paymentLink = await stripeServerClient.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/payment-success?studentId=${studentId}`,
        },
      },
      payment_method_types: ['us_bank_account'],
      metadata: {
        studentId: student.id,
        studentName: student.name,
        paymentType: 'subscription',
        siblingGroupId: student.siblingGroupId || '',
        createdAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      subscription_data: {
        metadata: {
          studentId: student.id,
          studentName: student.name,
          monthlyRate: amount / 100,
          siblingGroupId: student.siblingGroupId || '',
          createdAt: new Date().toISOString(),
          source: 'payment_link',
          environment: process.env.NODE_ENV,
        },
        description: `Monthly tuition for ${student.name}`,
      },
      automatic_tax: { enabled: false },
    })

    // Return the payment link URL
    return NextResponse.json({
      success: true,
      url: paymentLink.url,
      id: paymentLink.id,
    })
  } catch (error) {
    console.error('Error creating payment link:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
```

### Success Page Handler

```typescript
export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.redirect('/')
  }

  try {
    // Find the student and associated payer
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { payer: true },
    })

    if (!student) {
      return NextResponse.redirect('/')
    }

    // If student has a payer with a Stripe customer ID, sync data
    if (student.payer?.stripeCustomerId) {
      await syncStripeDataToDatabase(student.payer.stripeCustomerId)
    }

    // Redirect to success page
    return NextResponse.redirect('/payment-success?synced=true')
  } catch (error) {
    console.error('Error in payment success handler:', error)
    return NextResponse.redirect('/payment-error')
  }
}
```

---

This comprehensive guide provides a solid foundation for implementing Stripe ACH payments in your application. By following these patterns and best practices, you can create a robust payment system that handles the complexities of ACH payments while maintaining data consistency between Stripe and your database.
