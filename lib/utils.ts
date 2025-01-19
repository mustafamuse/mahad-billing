import { type ClassValue, clsx } from 'clsx'
import Stripe from 'stripe'
import { twMerge } from 'tailwind-merge'

import { LogEventData } from '@/app/api/webhook/types'

import { BASE_RATE } from './data'
import { redis } from './redis'
import { Student } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFamilyDiscount(totalFamilyMembers: number): number {
  if (totalFamilyMembers >= 4) return 30
  if (totalFamilyMembers === 3) return 20
  if (totalFamilyMembers === 2) return 10
  return 0
}

export function calculateTotal(students: Student[]): number {
  return students.reduce((total, student) => total + student.monthlyRate, 0)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function calculateStudentPrice(student: Student): {
  price: number
  discount: number
  isSiblingDiscount: boolean
} {
  return {
    price: student.monthlyRate,
    discount: BASE_RATE - student.monthlyRate,
    isSiblingDiscount: !!student.familyId,
  }
}

export const formatDiscountType = (type: string, amount: number) => {
  if (type === 'Family Discount') {
    return `Fam ($${amount} off)`
  }
  return type
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
export function getBillingCycleAnchor(dayOfMonth: number = 1): number {
  // Get the current date and move to the next month
  const targetDate = new Date()
  targetDate.setMonth(targetDate.getMonth() + 1)

  // Set the desired day of the month (default to 1st if no day is provided)
  targetDate.setDate(dayOfMonth)

  // Reset the time to midnight
  targetDate.setHours(0, 0, 0, 0)

  // Return Unix timestamp
  return Math.floor(targetDate.getTime() / 1000)
}

export async function verifyPaymentSetup(customerId: string) {
  const [paymentSetup, bankAccount] = await Promise.all([
    redis.get(`payment_setup:${customerId}`),
    redis.get(`bank_account:${customerId}`),
  ])

  // Add debug logging
  console.log('Verification Check:', {
    customerId,
    paymentSetup,
    bankAccount,
    timestamp: new Date().toISOString(),
  })

  if (!paymentSetup || !bankAccount) {
    console.log('❌ Missing setup data:', { paymentSetup, bankAccount })
    return false
  }

  const setup =
    typeof paymentSetup === 'string' ? JSON.parse(paymentSetup) : paymentSetup

  const bank =
    typeof bankAccount === 'string' ? JSON.parse(bankAccount) : bankAccount

  console.log('🔍 Verification Status:', {
    setupCompleted: setup.setupCompleted,
    subscriptionActive: setup.subscriptionActive,
    bankVerified: bank.verified,
    timestamp: new Date(setup.timestamp).toISOString(),
  })

  return setup.setupCompleted && bank.verified
}

// Utility: Extract subscriptionId and customerId
export function extractIdsFromEvent(event: Stripe.Event): {
  subscriptionId: string | null
  customerId: string | null
} {
  const dataObject = event.data.object

  // Handle invoice events
  if (
    event.type === 'invoice.payment_succeeded' ||
    event.type === 'invoice.payment_failed'
  ) {
    const invoice = dataObject as Stripe.Invoice // Narrow type to Stripe.Invoice
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : (invoice.subscription?.id ?? null)

    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer?.id ?? null)

    return { subscriptionId, customerId }
  }

  // Handle payment method events
  if (event.type === 'payment_method.attached') {
    const paymentMethod = dataObject as Stripe.PaymentMethod // Narrow type to Stripe.PaymentMethod
    const customerId =
      typeof paymentMethod.customer === 'string' ? paymentMethod.customer : null

    return { subscriptionId: null, customerId }
  }

  // Log unhandled types
  console.warn(`⚠️ Unhandled event type in extractIdsFromEvent: ${event.type}`)
  return { subscriptionId: null, customerId: null }
}

// Utility: Handle Redis get and set
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRedisKey(redisKey: string): Promise<any | null> {
  try {
    const data = await redis.get(redisKey)

    // Redis can return a string or null. Ensure it's valid before parsing.
    if (typeof data === 'string') {
      return JSON.parse(data)
    }

    return null // Return null if no data is found
  } catch (error) {
    console.error('❌ Redis GET operation failed:', { redisKey, error })
    throw new Error('Redis operation failed')
  }
}

export async function setRedisKey<T>(redisKey: string, value: T, ttl: number) {
  // Validate TTL
  if (typeof ttl !== 'number' || ttl <= 0) {
    throw new Error(`Invalid TTL value: ${ttl}`)
  }

  try {
    // Save to Redis with expiration
    await redis.set(redisKey, JSON.stringify(value), { ex: ttl })
    console.log(`✅ Redis SET success:`, { redisKey, ttl })
  } catch (error) {
    console.error('❌ Redis SET operation failed:', {
      redisKey,
      value,
      ttl,
      error,
    })
    throw new Error('Redis operation failed')
  }
}

/**
 * Logs an event with structured data
 * @param message - The log message
 * @param eventId - The ID of the event (e.g. Stripe event ID)
 * @param data - Structured data about the event
 */
export function logEvent(
  message: string,
  eventId: string,
  data: LogEventData
): void {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`, {
    ...data,
  })
}

// Utility: Handle errors gracefully
export function handleError(action: string, eventId: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`[${action}] Error: ${eventId}`, {
    errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  })
  throw error // Re-throw to ensure Stripe retries the webhook if needed
}
