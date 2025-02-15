import { redis } from '@/lib/utils/redis'

type RateLimitEvent = {
  ip: string
  endpoint: string
  success: boolean
  timestamp: number
  resetTime?: number
}

export const monitoring = {
  logRateLimit: async (event: RateLimitEvent) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Rate Limit]', {
        ...event,
        time: new Date(event.timestamp).toISOString(),
        resetTime: event.resetTime
          ? new Date(event.resetTime).toISOString()
          : undefined,
      })
    }

    // In production, you might want to log to a monitoring service
    // or store in Redis for analysis
    try {
      await redis.lpush('rate-limit-logs', JSON.stringify(event))
      // Keep only last 1000 events
      await redis.ltrim('rate-limit-logs', 0, 999)
    } catch (error) {
      console.error('Failed to log rate limit event:', error)
    }
  },

  getRateLimitStats: async () => {
    try {
      const logs = await redis.lrange('rate-limit-logs', 0, -1)
      const events = logs.map((log) => JSON.parse(log) as RateLimitEvent)

      const now = Date.now()
      const last24h = now - 24 * 60 * 60 * 1000

      return {
        total: events.length,
        blocked: events.filter((e) => !e.success).length,
        last24h: events.filter((e) => e.timestamp > last24h).length,
        uniqueIPs: new Set(events.map((e) => e.ip)).size,
      }
    } catch (error) {
      console.error('Failed to get rate limit stats:', error)
      return null
    }
  },
}
