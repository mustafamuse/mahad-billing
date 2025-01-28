/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'

import { getWebhookSubscriptionStatusKey } from '@/app/api/webhook/redis-utils'
import {
  SubscriptionError,
  SubscriptionErrorCode,
  ErrorResponse,
} from '@/lib/types/errors'
import { logError, logInfo, logWarning } from '@/lib/utils/logger'
import { redis } from '@/lib/utils/redis'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const setupIntentId = searchParams.get('setup_intent')

  if (!setupIntentId) {
    const error = new SubscriptionError(
      'Missing setup_intent in query parameters',
      SubscriptionErrorCode.INVALID_REQUEST
    )
    logError(error)

    const errorResponse: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
      },
    }
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    // 1. Fetch subscription status from Redis
    const subscriptionStatusKey = getWebhookSubscriptionStatusKey(setupIntentId)
    let subscriptionStatusData: string | null

    try {
      subscriptionStatusData = (await redis.get(subscriptionStatusKey)) as
        | string
        | null
    } catch (error) {
      const subscriptionError = new SubscriptionError(
        'Failed to fetch subscription status from Redis',
        SubscriptionErrorCode.REDIS_OPERATION_FAILED,
        { setupIntentId }
      )
      logError(subscriptionError, { originalError: error })
      throw subscriptionError
    }

    if (!subscriptionStatusData) {
      logInfo('Subscription status pending', { setupIntentId })
      return NextResponse.json(
        {
          status: 'pending',
          message:
            'Subscription is still being processed. Please wait and try again shortly.',
        },
        { status: 200 }
      )
    }

    // 2. Parse the subscription status from Redis
    try {
      const subscriptionStatus = JSON.parse(subscriptionStatusData as string)

      if (subscriptionStatus.status === 'active') {
        if (!subscriptionStatus.subscriptionId) {
          const error = new SubscriptionError(
            'Subscription marked as active but missing ID',
            SubscriptionErrorCode.SUBSCRIPTION_CREATION_FAILED,
            { setupIntentId }
          )
          logError(error)
          throw error
        }

        logInfo('Subscription active', {
          setupIntentId,
          subscriptionId: subscriptionStatus.subscriptionId,
        })

        return NextResponse.json(
          {
            status: 'active',
            subscriptionId: subscriptionStatus.subscriptionId,
          },
          { status: 200 }
        )
      }

      // Handle failed status
      if (subscriptionStatus.status === 'failed') {
        const error = new SubscriptionError(
          'Subscription creation failed',
          SubscriptionErrorCode.SUBSCRIPTION_CREATION_FAILED,
          {
            setupIntentId,
            reason: subscriptionStatus.error,
          }
        )
        logError(error)
        throw error
      }

      // Log other statuses as warnings
      logWarning(`Subscription in ${subscriptionStatus.status} state`, {
        setupIntentId,
        status: subscriptionStatus.status,
        subscriptionId: subscriptionStatus.subscriptionId,
      })

      // 3. Handle other statuses
      return NextResponse.json(
        {
          status: subscriptionStatus.status,
          subscriptionId: subscriptionStatus.subscriptionId || null,
        },
        { status: 200 }
      )
    } catch (error) {
      if (error instanceof SubscriptionError) {
        throw error
      }
      const subscriptionError = new SubscriptionError(
        'Invalid subscription status data',
        SubscriptionErrorCode.VERIFICATION_DATA_INVALID,
        { setupIntentId }
      )
      logError(subscriptionError, { originalError: error })
      throw subscriptionError
    }
  } catch (error) {
    console.error('Error fetching subscription status:', error)

    const errorResponse: ErrorResponse = {
      error: {
        code:
          error instanceof SubscriptionError
            ? error.code
            : SubscriptionErrorCode.UNKNOWN_ERROR,
        message:
          error instanceof SubscriptionError
            ? error.message
            : 'An unexpected error occurred while checking subscription status',
        details: error instanceof SubscriptionError ? error.details : undefined,
      },
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
