import { config } from 'dotenv'
import prompts from 'prompts'
import Stripe from 'stripe'

// Load environment variables from .env.local
config({ path: '.env.local' })

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set in .env.local')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
})

// Error handling utility
async function safeStripeOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      switch (error.type) {
        case 'StripeInvalidRequestError':
          console.log(`Skipping operation: ${error.message}`)
          break
        case 'StripeAPIError':
          console.error(`API Error: ${error.message}`)
          break
        default:
          console.error(`${errorMessage}: ${error.message}`)
      }
    } else {
      console.error(`Unexpected error: ${error}`)
    }
    return null
  }
}

async function cleanupStripe() {
  try {
    console.log('Starting Stripe cleanup...')

    // Get all items to clean up
    const [
      subscriptions,
      customers,
      paymentMethods,
      setupIntents,
      paymentIntents,
      invoices,
    ] = await Promise.all([
      stripe.subscriptions.list({ limit: 100 }),
      stripe.customers.list({ limit: 100 }),
      stripe.paymentMethods.list({ type: 'us_bank_account', limit: 100 }),
      stripe.setupIntents.list({ limit: 100 }),
      stripe.paymentIntents.list({ limit: 100 }),
      stripe.invoices.list({ limit: 100 }),
    ])

    // Show summary
    console.log('\nFound:')
    console.log(`- ${subscriptions.data.length} subscriptions`)
    console.log(`- ${customers.data.length} customers`)
    console.log(`- ${paymentMethods.data.length} payment methods`)
    console.log(`- ${setupIntents.data.length} setup intents`)
    console.log(`- ${paymentIntents.data.length} payment intents`)
    console.log(`- ${invoices.data.length} invoices`)

    // Get confirmation
    const { confirmed } = await prompts({
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to delete all these items?',
      initial: false,
    })

    if (!confirmed) {
      console.log('Cleanup cancelled')
      process.exit(0)
    }

    // Cancel active subscriptions
    for (const subscription of subscriptions.data) {
      if (
        subscription.status === 'active' ||
        subscription.status === 'past_due'
      ) {
        console.log(`Canceling subscription: ${subscription.id}`)
        await safeStripeOperation(
          () => stripe.subscriptions.cancel(subscription.id),
          'Failed to cancel subscription'
        )
      } else {
        console.log(
          `Skipping subscription ${subscription.id} (status: ${subscription.status})`
        )
      }
    }

    // Cancel payment intents
    for (const intent of paymentIntents.data) {
      const cancelableStatuses = [
        'requires_payment_method',
        'requires_capture',
        'requires_confirmation',
        'requires_action',
        'processing',
      ]

      if (cancelableStatuses.includes(intent.status)) {
        if (intent.invoice) {
          console.log(`Skipping invoice-related payment intent ${intent.id}`)
          continue
        }

        console.log(`Canceling payment intent: ${intent.id}`)
        await safeStripeOperation(
          () => stripe.paymentIntents.cancel(intent.id),
          'Failed to cancel payment intent'
        )
      } else {
        console.log(
          `Skipping payment intent ${intent.id} (status: ${intent.status})`
        )
      }
    }

    // Cancel setup intents
    for (const intent of setupIntents.data) {
      const cancelableStatuses = [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
      ]

      if (cancelableStatuses.includes(intent.status)) {
        console.log(`Canceling setup intent: ${intent.id}`)
        await safeStripeOperation(
          () => stripe.setupIntents.cancel(intent.id),
          'Failed to cancel setup intent'
        )
      } else {
        console.log(
          `Skipping setup intent ${intent.id} (status: ${intent.status})`
        )
      }
    }

    // Void open invoices
    for (const invoice of invoices.data) {
      if (invoice.status && ['draft', 'open'].includes(invoice.status)) {
        console.log(`Voiding invoice: ${invoice.id}`)
        await safeStripeOperation(
          () => stripe.invoices.voidInvoice(invoice.id),
          'Failed to void invoice'
        )
      } else {
        console.log(
          `Skipping invoice ${invoice.id} (status: ${invoice.status || 'unknown'})`
        )
      }
    }

    // Detach payment methods
    for (const pm of paymentMethods.data) {
      if (pm.customer) {
        console.log(`Detaching payment method: ${pm.id}`)
        await safeStripeOperation(
          () => stripe.paymentMethods.detach(pm.id),
          'Failed to detach payment method'
        )
      }
    }

    // Delete customers
    for (const customer of customers.data) {
      console.log(`Deleting customer: ${customer.id}`)
      await safeStripeOperation(
        () => stripe.customers.del(customer.id),
        'Failed to delete customer'
      )
    }

    console.log('\nStripe cleanup completed successfully')
  } catch (error) {
    console.error('Error during cleanup:', error)
    process.exit(1)
  }
}

cleanupStripe()
