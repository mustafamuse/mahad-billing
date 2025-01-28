import { SubscriptionError, SubscriptionErrorCode } from '@/lib/types/errors'

interface LogContext {
  setupIntentId?: string
  subscriptionId?: string
  customerId?: string
  error?: Error | unknown
  [key: string]: unknown
}

interface ErrorLog extends LogContext {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  code?: SubscriptionErrorCode
  message: string
  stack?: string
}

export function logError(
  error: Error | SubscriptionError,
  context: LogContext = {}
) {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    stack: error.stack,
    ...context,
  }

  if (error instanceof SubscriptionError) {
    errorLog.code = error.code
    errorLog.details = error.details
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      ...errorLog,
      context: context,
    })
  }

  // In production, you might want to send this to a logging service
  // Example: await sendToLoggingService(errorLog)

  // You could also track specific error types
  if (error instanceof SubscriptionError) {
    switch (error.code) {
      case SubscriptionErrorCode.SUBSCRIPTION_CREATION_FAILED:
      case SubscriptionErrorCode.BANK_ACCOUNT_VERIFICATION_FAILED:
      case SubscriptionErrorCode.SETUP_INTENT_EXPIRED:
        // These might warrant immediate attention
        // Example: await notifyTeam(errorLog)
        break

      case SubscriptionErrorCode.TOO_MANY_REQUESTS:
        // Track rate limiting incidents
        // Example: await trackRateLimiting(errorLog)
        break
    }
  }
}

export function logWarning(message: string, context: LogContext = {}) {
  const warningLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    ...context,
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('Warning:', warningLog)
  }
  // Example: await sendToLoggingService(warningLog)
}

export function logInfo(message: string, context: LogContext = {}) {
  const infoLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...context,
  }

  if (process.env.NODE_ENV === 'development') {
    console.info('Info:', infoLog)
  }
  // Example: await sendToLoggingService(infoLog)
}
