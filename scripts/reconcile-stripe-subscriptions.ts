// scripts/reconcile-stripe-subscriptions.ts
import { PrismaClient, SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'

import { stripeServerClient } from '../lib/stripe'

const prisma = new PrismaClient()

async function main() {
  // 1. Fetch all students
  const students = await prisma.student.findMany()

  // 2. Fetch all subscriptions from Stripe (paginated)
  let stripeSubs: Stripe.Subscription[] = []
  let hasMore = true
  let startingAfter: string | undefined = undefined
  while (hasMore) {
    const resp: Stripe.ApiList<Stripe.Subscription> =
      await stripeServerClient.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer'],
      })
    stripeSubs = stripeSubs.concat(resp.data)
    hasMore = resp.has_more
    startingAfter = resp.data.length
      ? resp.data[resp.data.length - 1].id
      : undefined
  }

  // 3. Build lookup maps for Stripe subscriptions
  const stripeSubsById = new Map(stripeSubs.map((sub) => [sub.id, sub]))
  const stripeSubsByCustomerEmail = new Map<string, Stripe.Subscription[]>()
  for (const sub of stripeSubs) {
    const email = (sub.customer as Stripe.Customer)?.email?.toLowerCase().trim()
    if (email) {
      if (!stripeSubsByCustomerEmail.has(email))
        stripeSubsByCustomerEmail.set(email, [])
      stripeSubsByCustomerEmail.get(email)!.push(sub)
    }
  }

  // 4. Update students with existing stripeSubscriptionId
  for (const student of students) {
    if (student.stripeSubscriptionId) {
      const sub = stripeSubsById.get(student.stripeSubscriptionId)
      if (sub) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            subscriptionStatus: sub.status as SubscriptionStatus,
          },
        })
        console.log(
          `Updated status for student ${student.name} (${student.id})`
        )
      }
    }
  }

  // 5. Match and update students missing a stripeSubscriptionId
  for (const student of students) {
    if (!student.stripeSubscriptionId) {
      // Try to match by email
      if (student.email) {
        const subs = stripeSubsByCustomerEmail.get(
          student.email.toLowerCase().trim()
        )
        if (subs && subs.length > 0) {
          // If multiple, pick the most recent or active
          const sub = subs.find((s) => s.status === 'active') || subs[0]
          await prisma.student.update({
            where: { id: student.id },
            data: {
              stripeSubscriptionId: sub.id,
              subscriptionStatus: sub.status as SubscriptionStatus,
            },
          })
          console.log(
            `Matched and updated student ${student.name} (${student.id}) by email`
          )
          continue
        }
      }
      // Try to match by name (less reliable)
      const subByName = stripeSubs.find((s) => {
        const customer = s.customer as Stripe.Customer
        return (
          customer?.name?.toLowerCase().trim() ===
          student.name.toLowerCase().trim()
        )
      })
      if (subByName) {
        await prisma.student.update({
          where: { id: student.id },
          data: {
            stripeSubscriptionId: subByName.id,
            subscriptionStatus: subByName.status as SubscriptionStatus,
          },
        })
        console.log(
          `Matched and updated student ${student.name} (${student.id}) by name`
        )
      }
    }
  }

  // 6. Log unmatched Stripe subscriptions and students
  const matchedSubIds = new Set(
    students.map((s) => s.stripeSubscriptionId).filter(Boolean)
  )
  let unmatchedSubs = stripeSubs.filter((sub) => !matchedSubIds.has(sub.id))
  let unmatchedStudents = students.filter((s) => !s.stripeSubscriptionId)

  // --- Improved: Case-insensitive, whitespace-trimmed email matching for unmatched students/subscriptions ---
  // 1. Build a map of unmatched Stripe subscriptions by normalized email
  const unmatchedStripeSubsByEmail = new Map<string, Stripe.Subscription[]>()
  for (const sub of unmatchedSubs) {
    const customer = sub.customer as Stripe.Customer
    const email = customer?.email?.toLowerCase().trim()
    if (email) {
      if (!unmatchedStripeSubsByEmail.has(email))
        unmatchedStripeSubsByEmail.set(email, [])
      unmatchedStripeSubsByEmail.get(email)!.push(sub)
    }
  }

  // 2. For each unmatched student, try to match by normalized email
  for (const student of unmatchedStudents) {
    if (student.email) {
      const normalizedEmail = student.email.toLowerCase().trim()
      const subs = unmatchedStripeSubsByEmail.get(normalizedEmail)
      if (subs && subs.length > 0) {
        // Prefer active, otherwise most recent
        const sub = subs.find((s) => s.status === 'active') || subs[0]
        await prisma.student.update({
          where: { id: student.id },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status as SubscriptionStatus,
          },
        })
        console.log(
          `Improved match: updated student ${student.name} (${student.id}) by normalized email`
        )
        // Remove this subscription from unmatched list to avoid double-matching
        subs.splice(subs.indexOf(sub), 1)
        if (subs.length === 0)
          unmatchedStripeSubsByEmail.delete(normalizedEmail)
      }
    }
  }

  // Recompute unmatched lists after improved matching
  unmatchedSubs = []
  for (const subs of Array.from(unmatchedStripeSubsByEmail.values()))
    unmatchedSubs.push(...subs)
  unmatchedStudents = (await prisma.student.findMany()).filter(
    (s) => !s.stripeSubscriptionId
  )

  if (unmatchedSubs.length) {
    console.log('Unmatched Stripe subscriptions:')
    unmatchedSubs.forEach((sub) => {
      const customer = sub.customer as Stripe.Customer
      console.log(
        `  - ${sub.id} (${sub.status}) | customer: ${customer?.email || customer?.id}`
      )
    })
  }
  if (unmatchedStudents.length) {
    console.log('Unmatched students:')
    unmatchedStudents.forEach((s) =>
      console.log(`  - ${s.name} (${s.email || 'no email'})`)
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
