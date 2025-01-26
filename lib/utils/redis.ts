import { Redis } from '@upstash/redis'

// Initialize Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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

export async function setRedisKey<T>(redisKey: string, value: T, ttl: number) {
  // Validate TTL
  if (typeof ttl !== 'number' || ttl <= 0) {
    throw new Error(`Invalid TTL value: ${ttl}`)
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
