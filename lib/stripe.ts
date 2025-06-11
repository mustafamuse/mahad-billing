import Stripe from 'stripe'
let stripeClient: Stripe | null = null
// Get configured server-side Stripe client
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not defined. Please set it in your environment variables.'
    )
  }

  if (!stripeClient) {
    console.log('Initializing Stripe client...')
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-04-30.basil',
      typescript: true,
    })
  }
  return stripeClient
}

// Export a proxy object that lazily initializes the client
export const stripeServerClient = new Proxy({} as Stripe, {
  get: (target, prop) => {
    const client = getStripeClient()
    const value = client[prop as keyof Stripe]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// Optional: Test initialization during app startup
export async function testStripeClientInitialization(): Promise<void> {
  try {
    const client = getStripeClient()
    await client.customers.list({ limit: 1 })
    console.log('Stripe client initialized successfully.')
  } catch (error) {
    console.error('Stripe client initialization failed:', error)
  }
}
