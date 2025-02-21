import { SubscriptionStatus } from '@prisma/client'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { LogEventData } from '@/app/api/webhook/types'

import { StudentDTO } from './actions/get-students'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFamilyDiscount(totalFamilyMembers: number): number {
  if (totalFamilyMembers >= 4) return 30
  if (totalFamilyMembers === 3) return 20
  if (totalFamilyMembers === 2) return 10
  return 0
}

export function calculateTotal(students: StudentDTO[]): number {
  return students.reduce((total, student) => total + student.monthlyRate, 0)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
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

export function getStatusColor(status: SubscriptionStatus) {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case SubscriptionStatus.PAST_DUE:
      return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
    case SubscriptionStatus.CANCELED:
      return 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    case SubscriptionStatus.INCOMPLETE:
      return 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
    case SubscriptionStatus.TRIALING:
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case SubscriptionStatus.INACTIVE:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
    default:
      return 'bg-gray-50 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
  }
}
