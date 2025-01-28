// Redis key generation utilities
export const getWebhookEventKey = (eventId: string) =>
  `${KEY_PREFIX.WEBHOOK_EVENT}:${eventId}`

export const getLastEventKey = (eventType: string, objectId: string) =>
  `${KEY_PREFIX.LAST_EVENT}:${eventType}:${objectId}`

export const getPaymentStatusKey = (id: string) =>
  `${KEY_PREFIX.PAYMENT_STATUS}:${id}`
// Redis key prefix constants
export const KEY_PREFIX = {
  WEBHOOK_EVENT: 'stripe:webhook:event',
  LAST_EVENT: 'stripe:webhook:last_event',
  PAYMENT_STATUS: 'stripe:payment:status',
  SUBSCRIPTION_STATUS: 'stripe:subscription:status',
  SETUP_VERIFICATION: 'stripe:setup:verification',
  SETUP_INTENT_METADATA: 'stripe:setup_intent:metadata',
  STUDENTS: 'stripe:setup:students',
  STUDENT: 'student',
  CUSTOMER: 'customer',
} as const

// Additional Redis key utilities for recovery
export const REDIS_KEYS = {
  RECOVERY_ATTEMPT: (eventId: string) => `stripe:recovery:attempt:${eventId}`,
  CHUNK_STATS: (start: number, end: number) =>
    `stripe:recovery:chunk:${start}:${end}`,
  RECOVERY_RANGE: 'stripe:recovery:processed_ranges',
  RECOVERY_PROGRESS: (source: string) => `stripe:recovery:progress:${source}`,
} as const
