import { NextResponse } from 'next/server'

import { redis } from '@/lib/redis'
import { PaymentNotification } from '@/lib/types'

export async function GET() {
  const notifications = await redis.lrange('payment_notifications', 0, -1)
  const parsed = notifications.map((n) =>
    JSON.parse(n)
  ) as PaymentNotification[]
  return NextResponse.json(parsed)
}
