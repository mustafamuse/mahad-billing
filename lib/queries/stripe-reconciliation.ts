import { SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'

import { prisma } from '@/lib/db'

// Create a lazy Stripe client that only initializes when needed
const getStripeClient = () => {
  const apiKey = process.env.STRIPE_LIVE_SECRET_KEY
  if (!apiKey) {
    throw new Error('STRIPE_LIVE_SECRET_KEY is not configured')
  }
  return new Stripe(apiKey, {
    apiVersion: '2024-11-20.acacia',
  })
}

interface StripeSubscriptionInfo {
  customerId: string
  subscriptionId: string
  status: string
  currentPeriodEnd: number
  currentPeriodStart: number
  lastPaymentDate: Date | null
  nextPaymentDate: Date | null
  metadata: {
    studentId?: string
    studentName?: string
    monthlyRate?: string
    whatsappNumber?: string
    studentEmail?: string
  }
}

interface CheckoutCustomFields {
  studentsemailonethatyouusedtoregister?: {
    text: { value: string }
  }
  studentswhatsappthatyouuseforourgroup?: {
    numeric: { value: string }
  }
}

interface CheckoutMetadata {
  studentName?: string
  whatsappNumber?: string
  checkoutSessionId?: string
  studentEmail?: string
}

interface UnmatchedSubscription {
  customerId: string
  subscriptionId: string
  customerEmail: string
  customerName: string
  status: string
  currentPeriodEnd: number
  currentPeriodStart: number
  lastPaymentDate: Date | null
  nextPaymentDate: Date | null
  metadata: Record<string, any>
}

export interface ReconciliationResult {
  student: {
    id: string
    name: string
    email: string | null
  } | null
  databaseSubscription: {
    stripeSubscriptionId: string | null
    status: SubscriptionStatus | null
  } | null
  stripeSubscription: StripeSubscriptionInfo | UnmatchedSubscription
  needsReconciliation: boolean
  isUnmatched: boolean
}

// Helper function to find matching student using various data points
async function findMatchingStudent(
  students: any[],
  customerEmail: string,
  metadata?: { studentName?: string; whatsappNumber?: string }
) {
  // 1. First try exact email match
  let matchingStudent = students.find(
    (s) => s.email?.toLowerCase() === customerEmail.toLowerCase()
  )

  if (matchingStudent) return matchingStudent

  // 2. Try fuzzy email match (remove dots and everything after +)
  const normalizedCustomerEmail = customerEmail
    .toLowerCase()
    .replace(/\./g, '')
    .split('+')[0]

  matchingStudent = students.find((s) => {
    if (!s.email) return false
    const normalizedStudentEmail = s.email
      .toLowerCase()
      .replace(/\./g, '')
      .split('+')[0]
    return normalizedStudentEmail === normalizedCustomerEmail
  })

  if (matchingStudent) return matchingStudent

  // 3. If no match and we have metadata, try matching by name
  if (metadata?.studentName) {
    const normalizedName = metadata.studentName.toLowerCase().trim()
    matchingStudent = students.find(
      (s) => s.name.toLowerCase().trim() === normalizedName
    )
  }

  return matchingStudent
}

export async function findUnlinkedSubscriptions() {
  try {
    // 1. Get all students from database with their current subscription status
    const students = await prisma.student
      .findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          payer: {
            select: {
              subscriptions: {
                select: {
                  stripeSubscriptionId: true,
                  status: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 1,
              },
            },
          },
        },
      })
      .catch((error) => {
        console.error('Prisma query failed:', error)
        throw new Error(`Database query failed: ${error.message}`)
      })

    // 2. Get all existing subscription records from our database that are linked to payers
    const existingSubscriptions = await prisma.subscription.findMany({
      where: {
        payer: {
          id: {
            not: undefined,
          },
        },
      },
      include: {
        payer: {
          include: {
            students: true,
          },
        },
      },
    })

    // Create a map of stripe subscription IDs to our database records
    const linkedSubscriptionsMap = new Map(
      existingSubscriptions.map((sub) => [sub.stripeSubscriptionId, sub])
    )

    const results: ReconciliationResult[] = []
    const processedStripeIds = new Set<string>()

    // 3. Fetch all active subscriptions from Stripe in one call
    const allStripeSubscriptions = await getStripeClient().subscriptions.list({
      status: 'active',
      expand: [
        'data.customer',
        'data.latest_invoice',
        'data.latest_invoice.payment_intent',
        'data.default_payment_method',
      ],
      limit: 100,
    })

    // 4. Create a map of customer emails to subscriptions for faster lookup
    const customerEmailToSubscription = new Map<string, Stripe.Subscription>()
    for (const subscription of allStripeSubscriptions.data) {
      const customer = subscription.customer as Stripe.Customer
      if (customer?.email) {
        customerEmailToSubscription.set(
          customer.email.toLowerCase(),
          subscription
        )
      }
    }

    // 5. First process all students in our database
    for (const student of students) {
      if (!student.email) continue

      const subscription = customerEmailToSubscription.get(
        student.email.toLowerCase()
      )
      if (subscription) {
        processedStripeIds.add(subscription.id)
        const customer = subscription.customer as Stripe.Customer
        const databaseSubscription = student.payer?.subscriptions[0]

        // Get metadata from the subscription
        const metadata = {
          ...subscription.metadata,
          studentName: subscription.metadata.studentName,
          whatsappNumber: subscription.metadata.whatsappNumber,
        }

        // Get payment information
        const invoices = await getStripeClient().invoices.list({
          subscription: subscription.id,
          status: 'paid',
          limit: 1,
        })

        const latestPaidInvoice = invoices.data[0]
        const lastPaymentDate = latestPaidInvoice?.status_transitions?.paid_at
          ? new Date(latestPaidInvoice.status_transitions.paid_at * 1000)
          : null
        const nextPaymentDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null

        // Check if this subscription needs reconciliation
        const needsReconciliation =
          !databaseSubscription ||
          databaseSubscription.stripeSubscriptionId !== subscription.id ||
          databaseSubscription.status !== mapStripeStatus(subscription.status)

        if (needsReconciliation) {
          results.push({
            student: {
              id: student.id,
              name: student.name,
              email: student.email,
            },
            databaseSubscription: databaseSubscription || null,
            stripeSubscription: {
              customerId: customer.id,
              subscriptionId: subscription.id,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end,
              currentPeriodStart: subscription.current_period_start,
              metadata,
              lastPaymentDate,
              nextPaymentDate,
            },
            needsReconciliation,
            isUnmatched: false,
          })
        }
      }
    }

    // 6. Process remaining subscriptions
    for (const subscription of allStripeSubscriptions.data) {
      if (processedStripeIds.has(subscription.id)) continue

      // Check if this subscription is already linked in our database
      const existingSubscription = linkedSubscriptionsMap.get(subscription.id)
      if (existingSubscription) {
        // Skip if already properly linked
        continue
      }

      const customer = subscription.customer as Stripe.Customer
      if (!customer?.email) continue

      // Get payment information
      const invoices = await getStripeClient().invoices.list({
        subscription: subscription.id,
        status: 'paid',
        limit: 1,
      })

      const latestPaidInvoice = invoices.data[0]
      const lastPaymentDate = latestPaidInvoice?.status_transitions?.paid_at
        ? new Date(latestPaidInvoice.status_transitions.paid_at * 1000)
        : null
      const nextPaymentDate = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : null

      // Try to get metadata from the payment intent if available
      let checkoutSessionMetadata: CheckoutMetadata = {}
      if (
        subscription.latest_invoice &&
        typeof subscription.latest_invoice !== 'string' &&
        subscription.latest_invoice.payment_intent &&
        typeof subscription.latest_invoice.payment_intent !== 'string' &&
        subscription.latest_invoice.payment_intent.metadata?.checkout_session
      ) {
        try {
          const checkoutSession =
            await getStripeClient().checkout.sessions.retrieve(
              subscription.latest_invoice.payment_intent.metadata
                .checkout_session,
              {
                expand: ['custom_fields', 'customer_details'],
              }
            )

          if (checkoutSession) {
            const customFields =
              checkoutSession.custom_fields as unknown as CheckoutCustomFields[]

            const emailField = customFields?.find(
              (field) => 'studentsemailonethatyouusedtoregister' in field
            )
            const studentEmail =
              emailField?.studentsemailonethatyouusedtoregister?.text?.value

            const whatsappField = customFields?.find(
              (field) => 'studentswhatsappthatyouuseforourgroup' in field
            )
            const whatsappNumber =
              whatsappField?.studentswhatsappthatyouuseforourgroup?.numeric
                ?.value

            checkoutSessionMetadata = {
              studentName: checkoutSession.customer_details?.name || undefined,
              whatsappNumber: whatsappNumber,
              checkoutSessionId: checkoutSession.id,
              studentEmail: studentEmail,
            }
          }
        } catch (error) {
          console.error(
            `Error fetching checkout session for ${subscription.id}:`,
            error
          )
        }
      }

      const metadata = {
        studentName:
          subscription.metadata.studentName ||
          checkoutSessionMetadata?.studentName ||
          customer.metadata?.studentName ||
          undefined,
        whatsappNumber:
          subscription.metadata.whatsappNumber ||
          checkoutSessionMetadata?.whatsappNumber ||
          customer.metadata?.whatsappNumber ||
          undefined,
        studentEmail:
          checkoutSessionMetadata?.studentEmail ||
          subscription.metadata.studentEmail ||
          undefined,
      }

      // Try to find matching student using all available data points
      const matchingStudent = await findMatchingStudent(
        students,
        checkoutSessionMetadata?.studentEmail || customer.email || '',
        metadata
      )

      if (matchingStudent) {
        const databaseSubscription = matchingStudent.payer?.subscriptions[0]

        results.push({
          student: {
            id: matchingStudent.id,
            name: matchingStudent.name,
            email: matchingStudent.email || '',
          },
          databaseSubscription: databaseSubscription || null,
          stripeSubscription: {
            customerId: customer.id,
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            currentPeriodStart: subscription.current_period_start,
            metadata: {
              ...subscription.metadata,
              ...metadata,
            },
            lastPaymentDate,
            nextPaymentDate,
          },
          needsReconciliation: true,
          isUnmatched: false,
        })
      } else {
        // Only mark as unmatched if not already linked in our database
        results.push({
          student: null,
          databaseSubscription: null,
          stripeSubscription: {
            customerId: customer.id,
            subscriptionId: subscription.id,
            customerEmail: customer.email,
            customerName: customer.name || '',
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            currentPeriodStart: subscription.current_period_start,
            metadata: {
              ...subscription.metadata,
              ...customer.metadata,
              ...metadata,
            },
            lastPaymentDate,
            nextPaymentDate,
          },
          needsReconciliation: true,
          isUnmatched: true,
        })
      }
    }

    return results
  } catch (error) {
    console.error('findUnlinkedSubscriptions failed:', error)
    throw error
  }
}

export async function reconcileSubscription(
  reconciliationData: ReconciliationResult
) {
  const { student, stripeSubscription } = reconciliationData

  if (!student || !stripeSubscription) {
    throw new Error('Missing student or subscription data')
  }

  // 1. Find or create payer
  const customer = (await getStripeClient().customers.retrieve(
    stripeSubscription.customerId
  )) as Stripe.Customer

  // Validate required customer data
  if (!customer.email) {
    throw new Error('Cannot create payer: Stripe customer is missing email')
  }

  let payer = await prisma.payer.findFirst({
    where: {
      OR: [
        { stripeCustomerId: stripeSubscription.customerId },
        { email: customer.email },
      ],
    },
  })

  if (!payer) {
    // Extract customer name components
    const customerName = customer.name || `${customer.email.split('@')[0]}`

    payer = await prisma.payer.create({
      data: {
        name: customerName,
        email: customer.email,
        phone: customer.phone || 'Not provided',
        stripeCustomerId: customer.id,
      },
    })
  }

  // 2. Update student with payer
  await prisma.student.update({
    where: { id: student.id },
    data: { payerId: payer.id },
  })

  // 3. Create or update subscription
  await prisma.subscription.upsert({
    where: {
      stripeSubscriptionId: stripeSubscription.subscriptionId,
    },
    create: {
      stripeSubscriptionId: stripeSubscription.subscriptionId,
      payerId: payer.id,
      status: mapStripeStatus(stripeSubscription.status),
      currentPeriodStart: new Date(
        stripeSubscription.currentPeriodStart * 1000
      ),
      currentPeriodEnd: new Date(stripeSubscription.currentPeriodEnd * 1000),
    },
    update: {
      status: mapStripeStatus(stripeSubscription.status),
      currentPeriodStart: new Date(
        stripeSubscription.currentPeriodStart * 1000
      ),
      currentPeriodEnd: new Date(stripeSubscription.currentPeriodEnd * 1000),
    },
  })
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'past_due':
      return SubscriptionStatus.PAST_DUE
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'incomplete':
      return SubscriptionStatus.INCOMPLETE
    default:
      return SubscriptionStatus.INACTIVE
  }
}
