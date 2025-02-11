import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
) {
  const key = `rate-limit:${identifier}`

  const [response] = await redis.multi().incr(key).expire(key, window).exec()

  const currentCount = response as number

  return {
    success: currentCount <= limit,
    remaining: Math.max(0, limit - currentCount),
    reset: Date.now() + window * 1000,
  }
}
