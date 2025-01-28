import type { Stripe } from 'stripe'

export interface StoredEventData {
  type: string
  objectId: string
  created: number
  processedAt: number
  metadata?: Record<string, unknown>
}

export interface LastEventData {
  eventId: string
  type: string
  timestamp: number
  objectId: string
  metadata?: Record<string, unknown>
}

export interface LogEventData {
  eventId: string
  type: string
  message?: string
  metadata?: Record<string, any>
  error?: string
  timestamp: number
  customerId?: string
  setupIntentId?: string
  amount?: number
  status?: string
  subscriptionId?: string
  subscriptionStatus?: {
    status: 'pending' | 'processing' | 'completed' | 'failed'
    createdAt: string
    updatedAt: string
  }
  paymentMethodId?: string
  bankName?: string
  last4?: string
  source?: 'automated' | 'manual' | 'dashboard'
  priority?: EventPriority
  attempts?: number
  maxRetries?: number
  attempt?: number
  delay?: number
  chunk_stats?: {
    chunkStart: number
    chunkEnd: number
    totalEvents: number
    missingEvents: number
    replayedEvents: number
    failedReplays: number
  }
  studentKey?: string
  total?: string
}

export interface ErrorContext {
  eventId: string
  type: string
  created: number
  account?: string
  apiVersion: string | null
  objectId?: string
  objectType?: string
  existing?: StoredEventData | LastEventData | null
  currentTimestamp?: number
  lastEvent?: {
    eventId: string
    timestamp: number
    type: string
  }
  timeDifference?: number
  error?: string
}

export class WebhookValidationError extends Error {
  constructor(
    message: string,
    public code:
      | 'DUPLICATE'
      | 'MISSING_ID'
      | 'OUT_OF_ORDER'
      | 'REDIS_ERROR'
      | 'HANDLER_ERROR',
    public eventId: string,
    public context: ErrorContext
  ) {
    super(message)
    this.name = 'WebhookValidationError'
  }
}

export type EventPriority = 1 | 2 | 3 // 1 = High, 2 = Medium, 3 = Low

export type EventHandler = (event: Stripe.Event) => Promise<boolean>

export type EventHandlers = Record<string, EventHandler>

// Recovery types
export interface RecoveryStats {
  totalEvents: number
  processedEvents: number
  failedEvents: number
  startTime: number
  endTime: number
  completedAt: number
}

export interface ChunkedRecoveryStats extends RecoveryStats {
  chunks: Array<{
    startTime: number
    endTime: number
    eventsProcessed: number
    eventsFailed: number
    pagesProcessed: number
  }>
  currentChunk: number
  totalChunks: number
}

export interface RecoveryOptions {
  source?: 'automated' | 'manual' | 'dashboard'
  maxPages?: number
  pageSize?: number
}

// Event type definitions
export type SupportedEventType =
  | 'setup_intent.succeeded'
  | 'setup_intent.requires_action'
  | 'invoice.created'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'

// Event priority mapping
export const EVENT_PRIORITY: Record<SupportedEventType, EventPriority> = {
  // High Priority (Critical payment events)
  'setup_intent.succeeded': 1,
  'invoice.payment_succeeded': 1,
  'payment_intent.succeeded': 1,

  // Medium Priority (Important but not critical)
  'setup_intent.requires_action': 2,
  'invoice.payment_failed': 2,
  'customer.subscription.created': 2,
  'customer.subscription.updated': 2,

  // Low Priority (Informational)
  'invoice.created': 3,
  'customer.subscription.deleted': 3,
  'payment_intent.payment_failed': 3,
} as const

// Type guard for supported event types
export function isSupportedEventType(type: string): type is SupportedEventType {
  return type in EVENT_PRIORITY
}

// Helper function to get event priority
export function getEventPriority(eventType: string): EventPriority {
  return EVENT_PRIORITY[eventType as SupportedEventType] || 2 // Default to medium priority
}

// Recovery endpoint types
export interface RecoveryEndpointRequest {
  startTime: number // Unix timestamp in seconds
  endTime?: number // Optional end time, defaults to now
  mode?: 'chunked' | 'simple' // Recovery mode, defaults to chunked
}

export interface RecoveryEndpointResponse {
  success: boolean
  stats: RecoveryStats | ChunkedRecoveryStats
  error?: string
  duration?: number
}

export interface SubscriptionStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'active'
  subscriptionId?: string
  createdAt: string
  updatedAt: string
}
