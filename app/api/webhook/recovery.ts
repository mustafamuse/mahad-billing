import { redis } from '@/lib/redis'
import { stripeServerClient } from '@/lib/utils/stripe'

import { CONFIG } from './config'
import { getWebhookEventKey } from './redis-utils'
import { logEvent } from './utils'
import { validateAndTrackEvent } from './webhook-validation'

/**
 * Simple recovery function that fetches and replays missing events in a single pass
 */
export async function detectAndReplayMissingEvents(
  startTime: number,
  endTime: number = Math.floor(Date.now() / 1000)
) {
  const stats = {
    totalEvents: 0,
    missingEvents: 0,
    replayedEvents: 0,
    failedReplays: 0,
  }

  try {
    // Fetch events from Stripe
    const events = await stripeServerClient.events.list({
      created: { gte: startTime, lte: endTime },
      limit: CONFIG.PAGE_SIZE,
    })

    stats.totalEvents = events.data.length

    // Check each event against Redis
    for (const event of events.data) {
      const eventKey = getWebhookEventKey(event.id)
      const exists = await redis.get(eventKey)

      if (!exists) {
        stats.missingEvents++
        try {
          const success = await validateAndTrackEvent(event)
          if (success) {
            stats.replayedEvents++
          } else {
            stats.failedReplays++
          }
        } catch (error) {
          stats.failedReplays++
          logEvent('Recovery Event Failed', event.id, {
            eventId: event.id,
            type: event.type,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          })
        }
      }
    }

    return stats
  } catch (error) {
    logEvent('Recovery Failed', 'system', {
      eventId: 'system',
      type: 'recovery.error',
      error: error instanceof Error ? error.message : String(error),
      metadata: { stats },
      timestamp: Date.now(),
    })
    throw error
  }
}

/**
 * Chunked recovery function that processes events in smaller time chunks
 */
export async function detectAndReplayMissingEventsInChunks(
  startTime: number,
  endTime: number = Math.floor(Date.now() / 1000),
  options: { source?: string; maxPages?: number } = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source = 'automated', maxPages = CONFIG.MAX_PAGES } = options

  const stats = {
    totalEvents: 0,
    missingEvents: 0,
    replayedEvents: 0,
    failedReplays: 0,
    processedChunks: 0,
    skippedChunks: 0,
  }

  try {
    // Log start of chunked recovery
    logEvent('Starting chunked recovery', 'system', {
      eventId: 'system',
      type: 'recovery.chunks.start',
      message: 'Starting chunked event recovery',
      metadata: {
        startTime,
        endTime,
        source,
        chunkSize: CONFIG.CHUNK_SIZE,
      },
      timestamp: Date.now(),
    })

    // Process each chunk
    for (
      let chunkStart = startTime;
      chunkStart < endTime;
      chunkStart += CONFIG.CHUNK_SIZE
    ) {
      const chunkEnd = Math.min(chunkStart + CONFIG.CHUNK_SIZE, endTime)

      // Fetch and process events for this chunk
      const events = await stripeServerClient.events.list({
        created: { gte: chunkStart, lte: chunkEnd },
        limit: CONFIG.PAGE_SIZE,
      })

      stats.totalEvents += events.data.length

      // Process each event in the chunk
      for (const event of events.data) {
        const eventKey = getWebhookEventKey(event.id)
        const exists = await redis.get(eventKey)

        if (!exists) {
          stats.missingEvents++
          try {
            const success = await validateAndTrackEvent(event)
            if (success) {
              stats.replayedEvents++
            } else {
              stats.failedReplays++
            }
          } catch (error) {
            stats.failedReplays++
            logEvent('Chunk Recovery Event Failed', event.id, {
              eventId: event.id,
              type: event.type,
              error: error instanceof Error ? error.message : String(error),
              metadata: {
                chunk: stats.processedChunks + 1,
                totalChunks: Math.ceil(
                  (endTime - startTime) / CONFIG.CHUNK_SIZE
                ),
              },
              timestamp: Date.now(),
            })
          }
        }
      }

      stats.processedChunks++
    }

    // Log completion
    logEvent('Recovery completed', 'system', {
      eventId: 'system',
      type: 'recovery.chunks.complete',
      message: 'Chunked event recovery completed',
      metadata: {
        ...stats,
        startTime,
        endTime,
        source,
        duration: Date.now() - startTime * 1000,
      },
      timestamp: Date.now(),
    })

    return stats
  } catch (error) {
    logEvent('Chunked Recovery Failed', 'system', {
      eventId: 'system',
      type: 'recovery.error',
      error: error instanceof Error ? error.message : String(error),
      metadata: { stats },
      timestamp: Date.now(),
    })
    throw error
  }
}

/**
 * Future Enhancement: Manual Recovery Endpoint
 *
 * Consider adding a recovery endpoint at /api/webhook/recovery for manual intervention:
 * - Allows manual triggering of event recovery for specific time ranges
 * - Supports both chunked and simple recovery modes
 * - Useful for administrative tools and debugging
 *
 * Example Implementation:
 * POST /api/webhook/recovery
 * Body: {
 *   startTime: number    // Unix timestamp in seconds
 *   endTime?: number     // Optional end time, defaults to now
 *   mode?: 'chunked' | 'simple'  // Recovery mode, defaults to chunked
 * }
 *
 * Security Considerations:
 * - Require admin authentication
 * - Rate limit requests
 * - Add validation for time ranges
 * - Log all recovery attempts
 */
