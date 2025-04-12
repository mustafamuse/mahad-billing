import Stripe from 'stripe'

let stripeClient: Stripe | null = null

// Get configured server-side Stripe client
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not defined. Please add it to your environment variables.'
    )
  }

  if (!stripeClient) {
    console.log('Initializing Stripe client...')
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }

  return stripeClient
}

// Export a proxy object that lazily initializes the client
export const stripeServerClient = getStripeClient()

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
