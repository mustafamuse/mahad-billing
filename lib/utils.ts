import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
