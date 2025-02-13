export const PAYMENT_RULES = {
  // Grace Period Settings
  GRACE_PERIOD: {
    DAYS: 30, // Calendar days for the full grace period
    INITIAL_WARNING_DAYS: 5, // Business days before first warning
    FINAL_WARNING_DAYS: 15, // Calendar days before suspension
  },

  // Retry Settings
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_DAYS: 3, // Days between retry attempts
  },

  // Status Mappings
  STATUS_UPDATES: {
    PAYMENT_FAILED: 'past_due',
    PAYMENT_SUCCEEDED: 'enrolled',
    SUBSCRIPTION_CANCELED: 'inactive',
  } as const,

  // Payment Schedule
  SCHEDULE: {
    PAYMENT_DAY: 1, // Day of month for regular payments
    RETRY_HOUR: 3, // Hour of day for retry attempts (3 AM)
    TIMEZONE: 'America/Chicago',
  },
} as const

// Type for student status updates
export type StudentStatusType =
  (typeof PAYMENT_RULES.STATUS_UPDATES)[keyof typeof PAYMENT_RULES.STATUS_UPDATES]

// Helper functions
export function isValidStudentStatus(
  status: string
): status is StudentStatusType {
  return Object.values(PAYMENT_RULES.STATUS_UPDATES).includes(
    status as StudentStatusType
  )
}

export function getGracePeriodEnd(failureDate: Date): Date {
  const end = new Date(failureDate)
  end.setDate(end.getDate() + PAYMENT_RULES.GRACE_PERIOD.DAYS)
  return end
}

export function shouldProcessRetry(
  retryCount: number,
  lastAttemptDate: Date
): boolean {
  if (retryCount >= PAYMENT_RULES.RETRY.MAX_ATTEMPTS) return false

  const nextRetryDate = new Date(lastAttemptDate)
  nextRetryDate.setDate(
    nextRetryDate.getDate() + PAYMENT_RULES.RETRY.DELAY_DAYS
  )

  return new Date() >= nextRetryDate
}
