/**
 * Test script for verifying duplicate customer prevention logic
 *
 * Run with: npx ts-node scripts/test-duplicate-prevention.ts
 */

import { prisma } from '../lib/db'
import { stripeServerClient } from '../lib/stripe'

async function main() {
  console.log('Testing duplicate customer prevention logic...')

  // Test email - change this to test different scenarios
  const testEmail = 'test-duplicate@example.com'

  // Step 1: Check if a customer with this email already exists in Stripe
  console.log(
    `\nStep 1: Checking if customer with email ${testEmail} exists in Stripe...`
  )
  const existingStripeCustomers = await stripeServerClient.customers.list({
    email: testEmail,
    limit: 10,
  })

  if (existingStripeCustomers.data.length > 0) {
    console.log(
      `Found ${existingStripeCustomers.data.length} existing Stripe customers:`
    )
    existingStripeCustomers.data.forEach((customer) => {
      console.log(
        `- ID: ${customer.id}, Name: ${customer.name}, Created: ${new Date(customer.created * 1000).toISOString()}`
      )
      console.log(`  Metadata:`, customer.metadata)
    })
  } else {
    console.log('No existing Stripe customers found with this email.')
  }

  // Step 2: Check if a payer with this email exists in our database
  console.log(
    `\nStep 2: Checking if payer with email ${testEmail} exists in our database...`
  )
  const existingPayers = await prisma.payer.findMany({
    where: { email: testEmail },
    include: {
      students: true,
      subscriptions: true,
    },
  })

  if (existingPayers.length > 0) {
    console.log(`Found ${existingPayers.length} existing payers:`)
    existingPayers.forEach((payer) => {
      console.log(
        `- ID: ${payer.id}, Name: ${payer.firstName} ${payer.lastName}`
      )
      console.log(`  Stripe Customer ID: ${payer.stripeCustomerId}`)
      console.log(`  Students: ${payer.students.length}`)
      console.log(`  Subscriptions: ${payer.subscriptions.length}`)
    })
  } else {
    console.log('No existing payers found with this email.')
  }

  // Step 3: Simulate the prepare-setup logic
  console.log('\nStep 3: Simulating prepare-setup logic...')

  let stripeCustomerId: string | null = null

  // Check if payer exists in our database
  if (existingPayers.length > 0) {
    const existingPayer = existingPayers[0]
    console.log(`Found existing payer in database: ${existingPayer.id}`)

    if (existingPayer.stripeCustomerId) {
      console.log(
        `Payer has Stripe customer ID: ${existingPayer.stripeCustomerId}`
      )

      // Verify this customer still exists in Stripe
      try {
        const stripeCustomer = await stripeServerClient.customers.retrieve(
          existingPayer.stripeCustomerId
        )
        if (!stripeCustomer.deleted) {
          console.log('Stripe customer exists and is not deleted')
          stripeCustomerId = existingPayer.stripeCustomerId
          console.log('Would update existing customer with new details')
        } else {
          console.log('Stripe customer exists but is deleted')
          console.log('Would create new customer and update payer record')
        }
      } catch (error) {
        console.log('Error retrieving Stripe customer:', error)
        console.log('Would create new customer and update payer record')
      }
    } else {
      console.log('Payer has no Stripe customer ID')
      console.log('Would create new customer and update payer record')
    }
  }
  // Check if customer exists in Stripe but not in our database
  else if (existingStripeCustomers.data.length > 0) {
    console.log('Found existing Stripe customer but no payer in database')
    stripeCustomerId = existingStripeCustomers.data[0].id
    console.log(`Would use existing Stripe customer: ${stripeCustomerId}`)
    console.log('Would create new payer record with this Stripe customer ID')
  }
  // No existing customer found anywhere
  else {
    console.log('No existing customer found in database or Stripe')
    console.log('Would create new Stripe customer and new payer record')
  }

  console.log('\nTest completed!')
}

main()
  .catch((e) => {
    console.error('Error in test script:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
