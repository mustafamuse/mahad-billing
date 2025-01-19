import { Stripe } from 'stripe'

import { redis } from '@/lib/redis'

import { CONFIG } from './config'
import { getWebhookEventKey, getLastEventKey } from './redis-utils'
import {
  ErrorContext,
  LastEventData,
  LogEventData,
  StoredEventData,
  WebhookValidationError,
} from './types'
import { logEvent, handleError } from './utils'

/**
 * Validates and tracks a Stripe webhook event, ensuring proper ordering and preventing duplicates.
 * Routes events to appropriate handlers after validation.
 * Returns true if the event was processed successfully, false otherwise.
 */
export async function validateAndTrackEvent(
  event: Stripe.Event
): Promise<boolean> {
  const logContext: ErrorContext = {
    eventId: event.id,
    type: event.type,
    created: event.created,
    account: event.account,
    apiVersion: event.api_version,
  }

  try {
    const logData: LogEventData = {
      eventId: event.id,
      type: event.type,
      message: 'Starting event validation',
      metadata: {
        account: event.account,
        apiVersion: event.api_version,
      },
      timestamp: Date.now(),
    }
    logEvent('Starting event validation', event.id, logData)

    // Check for duplicate events
    const eventKey = getWebhookEventKey(event.id)
    const duplicateData = await redis.get(eventKey)
    if (duplicateData) {
      let existingEvent: StoredEventData | null = null
      try {
        existingEvent = duplicateData
          ? (JSON.parse(duplicateData as string) as StoredEventData)
          : null
      } catch {
        existingEvent = null
      }
      throw new WebhookValidationError(
        'Duplicate webhook event detected',
        'DUPLICATE',
        event.id,
        { ...logContext, existing: existingEvent }
      )
    }

    // Get the object ID based on event type
    const stripeObject = event.data.object as any
    const objectId = stripeObject?.id || null

    // Add object details to logging context
    logContext.objectId = objectId
    logContext.objectType = stripeObject?.object

    // Only check timestamp ordering if we have an object ID
    if (objectId) {
      const lastEventKey = getLastEventKey(event.type, objectId)
      const lastEventJson = await redis.get(lastEventKey)
      let lastEvent: LastEventData | null = null
      try {
        lastEvent = lastEventJson
          ? (JSON.parse(lastEventJson as string) as LastEventData)
          : null
      } catch {
        lastEvent = null
      }

      if (lastEvent && lastEvent.timestamp > event.created) {
        throw new WebhookValidationError(
          'Out of order event detected',
          'OUT_OF_ORDER',
          event.id,
          {
            ...logContext,
            currentTimestamp: event.created,
            lastEvent: {
              eventId: lastEvent.eventId,
              timestamp: lastEvent.timestamp,
              type: lastEvent.type,
            },
            timeDifference: lastEvent.timestamp - event.created,
          }
        )
      }

      // Store latest event data only if we have an object ID
      const lastEventData: LastEventData = {
        eventId: event.id,
        type: event.type,
        timestamp: event.created,
        objectId,
        metadata: {
          account: event.account,
          apiVersion: event.api_version,
          object: stripeObject.object,
        },
      }
      await redis.set(lastEventKey, JSON.stringify(lastEventData), {
        ex: CONFIG.TTL.LAST_EVENT,
      })
    } else {
      const noObjectIdLogData: LogEventData = {
        eventId: event.id,
        type: event.type,
        message: 'Event does not have a specific object ID',
        metadata: {
          account: event.account,
          apiVersion: event.api_version,
          created: event.created,
        },
        timestamp: Date.now(),
      }
      logEvent(
        'Event does not have a specific object ID',
        event.id,
        noObjectIdLogData
      )
    }

    // Store event data regardless of object ID
    try {
      const storedEventData: StoredEventData = {
        type: event.type,
        objectId: objectId || 'none',
        created: event.created,
        processedAt: Date.now(),
        metadata: {
          account: event.account,
          apiVersion: event.api_version,
          object: stripeObject?.object,
          livemode: event.livemode,
        },
      }
      await redis.set(eventKey, JSON.stringify(storedEventData), {
        ex: CONFIG.TTL.WEBHOOK_EVENT,
      })
    } catch (error) {
      throw new WebhookValidationError(
        'Failed to store event data in Redis',
        'REDIS_ERROR',
        event.id,
        {
          ...logContext,
          error: error instanceof Error ? error.message : String(error),
        }
      )
    }

    const validationSuccessLogData: LogEventData = {
      eventId: event.id,
      type: event.type,
      message: 'Event validation successful',
      timestamp: Date.now(),
    }
    logEvent('Event validation successful', event.id, validationSuccessLogData)

    return true
  } catch (error) {
    if (error instanceof WebhookValidationError) {
      console.warn(`🚨 ${error.code}: ${error.message}`, error.context)
    } else {
      handleError('Event Validation', event.id, error)
      console.error('❌ Unexpected error in event validation:', {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return false
  }
}
