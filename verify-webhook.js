const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Read the event handlers file to extract supported event types
const handlersPath = path.join(
  process.cwd(),
  'app/api/webhook/event-handlers.ts'
)
const handlersContent = fs.readFileSync(handlersPath, 'utf8')

// Extract supported event types from the file
const eventTypesMatch = handlersContent.match(
  /type SupportedEventTypes =([^;]+)/s
)
const supportedEvents = eventTypesMatch
  ? eventTypesMatch[1]
      .split('|')
      .map((type) => type.trim().replace(/'/g, '').replace(/\r?\n/g, ''))
      .filter((type) => type.length > 0)
  : []

// Extract handler functions to see which events are actually implemented
const handlerFunctions =
  handlersContent.match(/export async function handle([^(]+)/g) || []
const implementedHandlers = handlerFunctions.map((fn) =>
  fn
    .replace('export async function handle', '')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .substring(1)
)

console.log('\n=== WEBHOOK EVENT VERIFICATION ===\n')
console.log('Supported Event Types in Code:')
supportedEvents.forEach((event) => {
  console.log(`- ${event}`)
})

console.log('\nImplemented Handler Functions:')
implementedHandlers.forEach((handler) => {
  console.log(`- ${handler}`)
})

// Check if we can connect to Stripe to verify webhook configuration
try {
  // Check if stripe CLI is installed
  console.log('\nChecking Stripe CLI availability...')
  execSync('stripe --version', { stdio: 'pipe' })
  console.log(
    '✅ Stripe CLI is available. You can use it to test webhooks with:'
  )
  console.log('   stripe listen --forward-to http://localhost:3000/api/webhook')
} catch (error) {
  console.log('❌ Stripe CLI not found. Install it to test webhooks locally:')
  console.log(error)
}

// Check webhook route implementation
const webhookPath = path.join(process.cwd(), 'app/api/webhook/route.ts')
const webhookContent = fs.readFileSync(webhookPath, 'utf8')

console.log('\nWebhook Route Implementation:')
if (webhookContent.includes('stripeServerClient.webhooks.constructEvent')) {
  console.log('✅ Webhook signature verification is implemented')
} else {
  console.log('❌ Webhook signature verification may be missing')
}

if (webhookContent.includes('syncStripeDataToDatabase')) {
  console.log('✅ Database synchronization is implemented')
} else {
  console.log('❌ Database synchronization may be missing')
}

if (webhookContent.includes('markWebhookEventProcessed')) {
  console.log('✅ Idempotency handling is implemented')
} else {
  console.log('❌ Idempotency handling may be missing')
}

// Check for event handlers mapping
if (webhookContent.includes('eventHandlers[event.type')) {
  console.log('✅ Dynamic event handler mapping is implemented')
} else {
  console.log('❌ Dynamic event handler mapping may be missing')
}

// Check for ACH payment handling
const syncServicePath = path.join(process.cwd(), 'lib/services/stripe-sync.ts')
const syncServiceContent = fs.readFileSync(syncServicePath, 'utf8')

console.log('\nACH Payment Handling:')
if (syncServiceContent.includes('handleACHPaymentIntent')) {
  console.log('✅ ACH payment handling is implemented')
} else {
  console.log('❌ ACH payment handling may be missing')
}

console.log('\n=== VERIFICATION COMPLETE ===\n')
console.log('To test your webhook with real events:')
console.log(
  '1. Use Stripe CLI: stripe listen --forward-to http://localhost:3000/api/webhook'
)
console.log('2. Trigger test events: stripe trigger payment_intent.succeeded')
console.log('3. Check your logs for the [WEBHOOK] and [STRIPE-SYNC] prefixes')
