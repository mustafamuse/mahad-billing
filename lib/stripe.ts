import Stripe from 'stripe'

// Get configured server-side Stripe client
export function getStripeClient(mode: 'live' | 'test' = 'test'): Stripe {
  const key =
    mode === 'live'
      ? process.env.STRIPE_LIVE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY

  if (!key) {
    throw new Error(
      `${mode === 'live' ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_SECRET_KEY'} is not defined. Please set it in your environment variables.`
    )
  }

  return new Stripe(key, {
    apiVersion: '2024-11-20.acacia',
    typescript: true,
  })
}

// Export a proxy object that lazily initializes the client
export const stripeServerClient = new Proxy({} as Stripe, {
  get: (target, prop) => {
    const client = getStripeClient('test')
    const value = client[prop as keyof Stripe]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// Export a proxy object that lazily initializes the live client
export const stripeLiveClient = new Proxy({} as Stripe, {
  get: (target, prop) => {
    const client = getStripeClient('live')
    const value = client[prop as keyof Stripe]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// Optional: Test initialization during app startup
export async function testStripeClientInitialization(
  mode: 'live' | 'test' = 'test'
): Promise<void> {
  try {
    const client = getStripeClient(mode)
    await client.customers.list({ limit: 1 })
    console.log('Stripe client initialized successfully.')
  } catch (error) {
    console.error('Stripe client initialization failed:', error)
  }
}
