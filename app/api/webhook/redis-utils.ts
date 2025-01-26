import { KEY_PREFIX } from './config'

// Redis key generation utilities
export const getWebhookEventKey = (eventId: string) =>
  `${KEY_PREFIX.WEBHOOK_EVENT}:${eventId}`

export const getLastEventKey = (eventType: string, objectId: string) =>
  `${KEY_PREFIX.LAST_EVENT}:${eventType}:${objectId}`

export const getPaymentStatusKey = (id: string) =>
  `${KEY_PREFIX.PAYMENT_STATUS}:${id}`

export const getSubscriptionStatusKey = (subscriptionId: string) =>
  `${KEY_PREFIX.SUBSCRIPTION_STATUS}:${subscriptionId}`

export const getSetupVerificationKey = (setupIntentId: string) =>
  `${KEY_PREFIX.SETUP_VERIFICATION}:${setupIntentId}`

export const getSetupIntentMetadataKey = (customerId: string) =>
  `${KEY_PREFIX}:setup_intent_metadata:${customerId}`

export const getWebhookSubscriptionStatusKey = (setupIntentId: string) =>
  `${KEY_PREFIX}:subscription_status:${setupIntentId}`

// Additional Redis key utilities for recovery
export const REDIS_KEYS = {
  RECOVERY_ATTEMPT: (eventId: string) => `stripe:recovery:attempt:${eventId}`,
  CHUNK_STATS: (start: number, end: number) =>
    `stripe:recovery:chunk:${start}:${end}`,
  RECOVERY_RANGE: 'stripe:recovery:processed_ranges',
  RECOVERY_PROGRESS: (source: string) => `stripe:recovery:progress:${source}`,
  WEBHOOK_EVENT: 'stripe:webhook:event',
  LAST_EVENT: 'stripe:webhook:last_event',
  PAYMENT_STATUS: 'stripe:payment:status',
  SUBSCRIPTION_STATUS: 'stripe:subscription:status',
  SETUP_VERIFICATION: 'stripe:setup:verification',
} as const
