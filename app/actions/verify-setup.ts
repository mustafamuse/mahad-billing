'use server'

import { headers } from 'next/headers'

import { redis } from '@/lib/redis'

export async function verifySetup(setupIntentId: string) {
  console.log('🔍 Starting verifySetup action:', { setupIntentId })

  // Track attempt count to prevent infinite retries
  const attemptKey = `verify_attempt:${setupIntentId}`
  const failedKey = `verify_failed:${setupIntentId}`
  const processedKey = `processed_setup:${setupIntentId}`

  try {
    // Check if already failed too many times
    const attemptCount = (await redis.get<number>(attemptKey)) || 0
    console.log('📊 Current attempt count:', { attemptCount, setupIntentId })

    if (attemptCount >= 3) {
      console.warn('⚠️ Maximum attempts reached:', {
        setupIntentId,
        attemptCount,
      })
      await redis.set(failedKey, 'true', { ex: 86400 }) // Mark as permanently failed
      return {
        success: false,
        error:
          'Too many failed attempts. Please start over with a new enrollment.',
      }
    }

    // Check if already failed permanently
    const isFailed = await redis.get<string>(failedKey)
    if (isFailed) {
      console.warn('⚠️ Setup already marked as failed:', { setupIntentId })
      return {
        success: false,
        error:
          'This setup has failed. Please start over with a new enrollment.',
      }
    }

    // Check if already processed successfully
    const isProcessed = await redis.get<string>(processedKey)
    if (isProcessed) {
      console.log('✅ Setup already processed:', { setupIntentId })
      return { success: true, isProcessed: true }
    }

    // Increment attempt count
    console.log('📝 Incrementing attempt count:', {
      setupIntentId,
      newCount: attemptCount + 1,
    })
    await redis.set(attemptKey, attemptCount + 1, { ex: 300 }) // Expires in 5 minutes

    // Get the host from headers
    const headersList = headers()
    const host = headersList.get('host')
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    console.log('📡 Making API request to create-subscription:', {
      setupIntentId,
      baseUrl,
    })

    // Call the existing create-subscription endpoint with full URL
    const response = await fetch(`${baseUrl}/api/create-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setupIntentId,
        oneTimeCharge: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ Subscription creation failed:', {
        status: response.status,
        error,
      })
      throw new Error(error.error || 'Failed to create subscription')
    }

    // Clear attempt count on success
    console.log('🗑️ Clearing attempt count:', { setupIntentId })
    await redis.del(attemptKey)

    // Mark as processed
    console.log('✅ Marking setup as processed:', { setupIntentId })
    await redis.set(processedKey, 'true', {
      ex: 86400, // 24 hours
    })

    return { success: true, isProcessed: false }
  } catch (error) {
    console.error('❌ Verification error:', {
      setupIntentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // If this was the third attempt, mark as permanently failed
    const attemptCount = (await redis.get<number>(attemptKey)) || 0
    if (attemptCount >= 3) {
      console.warn('⚠️ Maximum attempts reached after error:', {
        setupIntentId,
        attemptCount,
      })
      await redis.set(failedKey, 'true', { ex: 86400 })
      return {
        success: false,
        error:
          'Too many failed attempts. Please start over with a new enrollment.',
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
      canRetry: true,
      attemptsLeft: 3 - attemptCount,
    }
  }
}
