import { Redis } from '@upstash/redis'

// Initialize Redis client
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Utility: Handle Redis get and set
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRedisKey(redisKey: string): Promise<any | null> {
  try {
    const data = await redis.get(redisKey)

    // Redis can return a string or null. Ensure it's valid before parsing.
    if (typeof data === 'string') {
      return JSON.parse(data)
    }

    return null // Return null if no data is found
  } catch (error) {
    console.error('❌ Redis GET operation failed:', { redisKey, error })
    throw new Error('Redis operation failed')
  }
}

// Default TTL values in seconds
export const DEFAULT_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 3600, // 1 hour
  LONG: 86400, // 24 hours
  VERY_LONG: 604800, // 7 days
} as const

export async function setRedisKey<T>(
  redisKey: string,
  value: T,
  ttl: number = DEFAULT_TTL.LONG
) {
  // Validate TTL with better error handling
  if (typeof ttl !== 'number') {
    console.warn(`Invalid TTL type for key ${redisKey}, using default TTL`, {
      providedTtl: ttl,
      defaultTtl: DEFAULT_TTL.LONG,
    })
    ttl = DEFAULT_TTL.LONG
  }

  // Ensure TTL is positive and within reasonable bounds
  if (ttl <= 0 || ttl > DEFAULT_TTL.VERY_LONG) {
    console.warn(`TTL out of bounds for key ${redisKey}, using default TTL`, {
      providedTtl: ttl,
      defaultTtl: DEFAULT_TTL.LONG,
    })
    ttl = DEFAULT_TTL.LONG
  }

  try {
    // Save to Redis with expiration
    await redis.set(redisKey, JSON.stringify(value), { ex: ttl })
    console.log(`✅ Redis SET success:`, { redisKey, ttl })
  } catch (error) {
    console.error('❌ Redis SET operation failed:', {
      redisKey,
      value,
      ttl,
      error,
    })
    throw new Error('Redis operation failed')
  }
}
