// Environment-based configuration types
interface EnvironmentConfig {
  // General configuration
  CHUNK_SIZE: number
  MAX_PAGES: number
  PAGE_SIZE: number

  // TTL configuration (in seconds)
  TTL: {
    WEBHOOK_EVENT: number
    LAST_EVENT: number
    PAYMENT_STATUS: number
    SUBSCRIPTION_STATUS: number
    SETUP_VERIFICATION: number
    RECOVERY_PROGRESS: number
  }

  // Retry configuration
  RETRY: {
    DELAYS: {
      1: readonly number[] // High priority
      2: readonly number[] // Medium priority
      3: readonly number[] // Low priority
    }
    MAX_RETRIES: {
      1: number
      2: number
      3: number
    }
    MAX_RETRY_DELAY: {
      1: number
      2: number
      3: number
    }
  }
}

// Redis key prefix constants
export const KEY_PREFIX = {
  WEBHOOK_EVENT: 'stripe:webhook:event',
  LAST_EVENT: 'stripe:webhook:last_event',
  PAYMENT_STATUS: 'stripe:payment:status',
  SUBSCRIPTION_STATUS: 'stripe:subscription:status',
  SETUP_VERIFICATION: 'stripe:setup:verification',
} as const

// Production configuration
const PROD_CONFIG: EnvironmentConfig = {
  CHUNK_SIZE: 15 * 60, // 15 minutes in seconds
  MAX_PAGES: parseInt(process.env.MAX_PAGES || '1000', 10),
  PAGE_SIZE: 100,

  TTL: {
    WEBHOOK_EVENT: 24 * 60 * 60, // 24 hours
    LAST_EVENT: 7 * 24 * 60 * 60, // 7 days
    PAYMENT_STATUS: 24 * 60 * 60, // 24 hours
    SUBSCRIPTION_STATUS: 24 * 60 * 60, // 24 hours
    SETUP_VERIFICATION: 30 * 60, // 30 minutes
    RECOVERY_PROGRESS: 24 * 60 * 60, // 24 hours
  },

  RETRY: {
    DELAYS: {
      1: [1000, 2000, 4000] as const, // High priority - retry quickly
      2: [5000, 10000, 20000] as const, // Medium priority
      3: [15000, 30000, 60000] as const, // Low priority
    },
    MAX_RETRIES: {
      1: 5, // High priority - more retries
      2: 3, // Medium priority
      3: 2, // Low priority
    },
    MAX_RETRY_DELAY: {
      1: 3600, // 1 hour TTL for high priority
      2: 7200, // 2 hours TTL for medium priority
      3: 14400, // 4 hours TTL for low priority
    },
  },
}

// Development configuration
const DEV_CONFIG: EnvironmentConfig = {
  CHUNK_SIZE: 5 * 60, // 5 minutes in seconds for faster testing
  MAX_PAGES: parseInt(process.env.MAX_PAGES || '100', 10),
  PAGE_SIZE: 50,

  TTL: {
    WEBHOOK_EVENT: 3600, // 1 hour
    LAST_EVENT: 3600, // 1 hour
    PAYMENT_STATUS: 86400, // 1 day
    SUBSCRIPTION_STATUS: 0, // No expiration
    SETUP_VERIFICATION: 86400, // 1 day
    RECOVERY_PROGRESS: 24 * 60 * 60, // 24 hours
  },

  RETRY: {
    DELAYS: {
      1: [500, 1000, 2000] as const, // Faster retries in dev
      2: [2000, 4000, 8000] as const,
      3: [5000, 10000, 20000] as const,
    },
    MAX_RETRIES: {
      1: 3, // Fewer retries in dev
      2: 2,
      3: 1,
    },
    MAX_RETRY_DELAY: {
      1: 1800, // 30 minutes TTL for high priority
      2: 3600, // 1 hour TTL for medium priority
      3: 7200, // 2 hours TTL for low priority
    },
  },
}

// Select configuration based on environment
export const CONFIG =
  process.env.NODE_ENV === 'production' ? PROD_CONFIG : DEV_CONFIG

export type { EnvironmentConfig }

// Log environment configuration on startup
import type { LogEventData } from './types'
import { logEvent } from './utils'

const envLogData: LogEventData = {
  eventId: 'system',
  type: 'system.config',
  message: 'Environment configuration loaded',
  metadata: {
    environment: process.env.NODE_ENV || 'development',
    chunkSize: CONFIG.CHUNK_SIZE,
    maxPages: CONFIG.MAX_PAGES,
    pageSize: CONFIG.PAGE_SIZE,
    retryLevels: {
      high: {
        maxRetries: CONFIG.RETRY.MAX_RETRIES[1],
        maxDelay: CONFIG.RETRY.MAX_RETRY_DELAY[1],
      },
      medium: {
        maxRetries: CONFIG.RETRY.MAX_RETRIES[2],
        maxDelay: CONFIG.RETRY.MAX_RETRY_DELAY[2],
      },
      low: {
        maxRetries: CONFIG.RETRY.MAX_RETRIES[3],
        maxDelay: CONFIG.RETRY.MAX_RETRY_DELAY[3],
      },
    },
  },
  timestamp: Date.now(),
}
logEvent('Environment configuration loaded', 'system', envLogData)
