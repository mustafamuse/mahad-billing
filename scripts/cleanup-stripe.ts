/* eslint-disable import/order */
// Built-in Node modules
import { config } from 'dotenv'
config({ path: '.env.local' })

const prompts = require('prompts')
import Stripe from 'stripe'

import { stripeServerClient } from '../lib/stripe'
/* eslint-enable import/order */

const requiredEnvVars = ['STRIPE_SECRET_KEY'] as const

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingEnvVars.forEach((envVar) => {
    console.error(`   - ${envVar}`)
  })
  console.error('\nPlease check your .env.local file')
  process.exit(1)
}

// Verify connections
async function verifyConnections() {
  try {
    // Test Stripe connection
    const stripeTest = await stripeServerClient.customers.list({ limit: 1 })
    if (!Array.isArray(stripeTest.data)) {
      throw new Error('Stripe API response invalid')
    }
    console.log('✅ Stripe connection verified')
  } catch (error) {
    console.error('❌ Connection verification failed:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    }
    process.exit(1)
  }
}

// Error handling utility
async function safeStripeOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error(`⚠️ ${errorMessage}: ${error.message}`)
    } else {
      console.error(`Unexpected error: ${error}`)
    }
    return null
  }
}

async function cleanupStripe() {
  try {
    console.log('🚀 Starting Stripe cleanup...\n')

    // Verify connections first
    await verifyConnections()

    // Retrieve all items to clean up
    console.log('\n📦 Fetching Stripe resources...')
    const [
      subscriptions,
      customers,
      paymentMethods,
      setupIntents,
      paymentIntents,
      invoices,
    ] = await Promise.all([
      stripeServerClient.subscriptions.list({ limit: 200 }),
      stripeServerClient.customers.list({ limit: 200 }),
      stripeServerClient.paymentMethods.list({
        type: 'us_bank_account',
        limit: 200,
      }),
      stripeServerClient.setupIntents.list({ limit: 200 }),
      stripeServerClient.paymentIntents.list({ limit: 200 }),
      stripeServerClient.invoices.list({ limit: 200 }),
    ])

    // Log summary
    console.log('\n🔍 Found the following items:')
    console.log(`- ${subscriptions.data.length} subscriptions`)
    console.log(`- ${customers.data.length} customers`)
    console.log(`- ${paymentMethods.data.length} payment methods`)
    console.log(`- ${setupIntents.data.length} setup intents`)
    console.log(`- ${paymentIntents.data.length} payment intents`)
    console.log(`- ${invoices.data.length} invoices\n`)

    // If no items to clean up, exit early
    const totalItems = [
      subscriptions.data,
      customers.data,
      paymentMethods.data,
      setupIntents.data,
      paymentIntents.data,
      invoices.data,
    ].reduce((sum, items) => sum + items.length, 0)

    if (totalItems === 0) {
      console.log('✨ No items to clean up!')
      return
    }

    // Confirm cleanup
    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message:
        '⚠️  Are you sure you want to delete all these items? This cannot be undone.',
      initial: false,
    })

    if (!confirmed) {
      console.log('🛑 Cleanup cancelled.')
      return
    }

    // Begin cleanup operations
    console.log('\n🧹 Starting cleanup operations...\n')

    // Step 1: Cancel active subscriptions
    for (const subscription of subscriptions.data) {
      if (['active', 'past_due', 'trialing'].includes(subscription.status)) {
        console.log(`🟡 Canceling subscription: ${subscription.id}`)
        await safeStripeOperation(
          () => stripeServerClient.subscriptions.cancel(subscription.id),
          `Failed to cancel subscription ${subscription.id}`
        )
      } else {
        console.log(
          `Skipping subscription ${subscription.id} (status: ${subscription.status})`
        )
      }
    }

    // Step 2: Cancel payment intents
    for (const intent of paymentIntents.data) {
      const cancelableStatuses = [
        'requires_payment_method',
        'requires_capture',
        'requires_confirmation',
        'requires_action',
        'processing',
      ]
      if (cancelableStatuses.includes(intent.status)) {
        if ('invoice' in intent && intent.invoice != null) {
          console.log(`Skipping invoice-related payment intent ${intent.id}`)
          continue
        }

        console.log(`🟡 Canceling payment intent: ${intent.id}`)
        await safeStripeOperation(
          () => stripeServerClient.paymentIntents.cancel(intent.id),
          `Failed to cancel payment intent ${intent.id}`
        )
      } else {
        console.log(
          `Skipping payment intent ${intent.id} (status: ${intent.status})`
        )
      }
    }

    // Step 3: Cancel setup intents
    for (const intent of setupIntents.data) {
      if (
        [
          'requires_payment_method',
          'requires_confirmation',
          'requires_action',
        ].includes(intent.status)
      ) {
        console.log(`🟡 Canceling setup intent: ${intent.id}`)
        await safeStripeOperation(
          () => stripeServerClient.setupIntents.cancel(intent.id),
          `Failed to cancel setup intent ${intent.id}`
        )
      } else {
        console.log(
          `Skipping setup intent ${intent.id} (status: ${intent.status})`
        )
      }
    }

    // Step 4: Void or delete open invoices
    for (const invoice of invoices.data) {
      if (!invoice.id) {
        console.warn(`Skipping invoice with missing ID`)
        continue
      }

      if (['draft', 'open'].includes(invoice.status ?? '')) {
        console.log(`🟡 Voiding invoice: ${invoice.id}`)
        await safeStripeOperation(
          () => stripeServerClient.invoices.voidInvoice(invoice.id!),
          `Failed to void invoice ${invoice.id}`
        )
      } else {
        console.log(
          `Skipping invoice ${invoice.id} (status: ${invoice.status || 'unknown'})`
        )
      }
    }

    // Step 5: Detach payment methods
    for (const pm of paymentMethods.data) {
      if (pm.customer) {
        console.log(`🟡 Detaching payment method: ${pm.id}`)
        await safeStripeOperation(
          () => stripeServerClient.paymentMethods.detach(pm.id),
          `Failed to detach payment method ${pm.id}`
        )
      }
    }

    // Step 6: Delete customers
    for (const customer of customers.data) {
      console.log(`🟡 Deleting customer: ${customer.id}`)
      await safeStripeOperation(
        () => stripeServerClient.customers.del(customer.id),
        `Failed to delete customer ${customer.id}`
      )
    }

    console.log('\n✅ Stripe cleanup completed successfully.')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

// Run cleanup with proper error handling
cleanupStripe()
  .then(() => {
    console.log('\n👋 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
