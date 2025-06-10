import { PrismaClient } from '@prisma/client'

import { stripeServerClient } from '../lib/stripe'

const prisma = new PrismaClient()
const GROUP_SUBSCRIPTION_THRESHOLD = 150 * 100 // Stripe amounts are in cents

async function main() {
  const students = await prisma.student.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: { id: true, name: true, stripeSubscriptionId: true },
  })

  const flaggedSubscriptions = new Set<string>()

  for (const student of students) {
    if (!student.stripeSubscriptionId) continue

    console.log(
      `Processing student: ${student.name} (${student.stripeSubscriptionId})`
    )

    // Fetch all invoices for this subscription
    let invoices
    try {
      invoices = await stripeServerClient.invoices.list({
        subscription: student.stripeSubscriptionId,
        status: 'paid',
        limit: 100,
        expand: ['data.lines'],
      })
    } catch (err: any) {
      if (err?.raw?.code === 'resource_missing') {
        console.warn(
          `Skipping student ${student.name} (${student.stripeSubscriptionId}): subscription not found in this Stripe mode`
        )
        continue
      }
      throw err
    }

    console.log(`  Found ${invoices.data.length} invoices for student.`)

    for (const invoice of invoices.data) {
      console.log(
        `  Invoice: ${invoice.id}, lines: ${invoice.lines.data.length}`
      )
      // Log the full invoice object for inspection
      console.dir(invoice, { depth: 3 })
      for (const line of invoice.lines.data) {
        // Check if this is a subscription line item
        if (!line.subscription) {
          console.warn(
            `Line ${line.id} is not a subscription line item, skipping.`
          )
          continue
        }

        // For subscription line items, we know it's recurring
        console.log(
          `    Line: ${line.id}, amount: ${line.amount}, subscription: ${line.subscription}`
        )
        // Log the full line object for inspection
        console.dir(line, { depth: 3 })

        const amountPaid = line.amount ?? 0
        const paidAt = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(invoice.created * 1000)

        // Stripe period is in seconds since epoch
        const periodStart = new Date(line.period.start * 1000)
        const year = periodStart.getUTCFullYear()
        const month = periodStart.getUTCMonth() + 1 // JS months are 0-based

        // Flag if amount is over threshold
        if (amountPaid > GROUP_SUBSCRIPTION_THRESHOLD) {
          flaggedSubscriptions.add(student.stripeSubscriptionId)
          console.log(
            `Flagged group/family subscription: ${student.name} (${student.stripeSubscriptionId}) - amount: ${amountPaid / 100}`
          )
        }

        // Skip if invoice.id is undefined
        if (!invoice.id) {
          console.warn(`Invoice ID is undefined, skipping payment record`)
          continue
        }

        // Upsert StudentPayment (avoid duplicates)
        await prisma.studentPayment.upsert({
          where: {
            studentId_stripeInvoiceId: {
              studentId: student.id,
              stripeInvoiceId: invoice.id,
            },
          },
          update: {
            amountPaid: amountPaid, // Store as cents (Stripe format)
            paidAt,
            year,
            month,
          },
          create: {
            studentId: student.id,
            stripeInvoiceId: invoice.id,
            year,
            month,
            amountPaid: amountPaid, // Store as cents (Stripe format)
            paidAt,
          },
        })
        console.log(
          `Created payment for ${student.name} (${year}-${month}): $${amountPaid / 100} on ${paidAt.toISOString()}`
        )
      }
    }
  }

  // Log all flagged subscriptions at the end
  if (flaggedSubscriptions.size > 0) {
    console.log('\nFlagged possible group/family subscriptions:')
    flaggedSubscriptions.forEach((subId) => console.log(`  - ${subId}`))
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
