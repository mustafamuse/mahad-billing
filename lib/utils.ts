import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { LogEventData } from '@/app/api/webhook/types'

import { BASE_RATE } from './data'
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
