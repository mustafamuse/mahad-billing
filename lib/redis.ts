import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!process.env.KV_REST_API_URL) {
    throw new Error('KV_REST_API_URL is not defined')
  }

  if (!process.env.KV_REST_API_TOKEN) {
    throw new Error('KV_REST_API_TOKEN is not defined')
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }

  return redisClient
}

export const redis = {
  ping: async () => getRedisClient().ping(),
  get: async (key: string) => getRedisClient().get(key),
  set: async (key: string, value: any, opts?: any) =>
    getRedisClient().set(key, value, opts),
  del: async (key: string) => getRedisClient().del(key),
  lrange: async (key: string, start: number, end: number) =>
    getRedisClient().lrange(key, start, end),
  // Add other Redis methods you use in your application
}
