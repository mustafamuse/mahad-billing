import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

import { stripeServerClient } from '../lib/stripe'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching all students with a Stripe Subscription ID...')
  const students = await prisma.student.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: { id: true, name: true, stripeSubscriptionId: true },
  })

  // Get a unique set of subscription IDs to process each subscription only once.
  const uniqueSubIds = new Set(
    students.map((s) => s.stripeSubscriptionId).filter(Boolean)
  )
  const subscriptionIds = Array.from(uniqueSubIds) as string[]
  console.log(
    `Found ${subscriptionIds.length} unique subscriptions to process.`
  )

  for (const subId of subscriptionIds) {
    if (!subId) continue

    // Find all students sharing this subscription in our database
    const studentsOnThisSub = students.filter(
      (s) => s.stripeSubscriptionId === subId
    )
    const studentNames = studentsOnThisSub.map((s) => s.name).join(', ')
    console.log(
      `\nProcessing Subscription ID: ${subId} (Shared by: ${studentNames})`
    )

    // Fetch all paid invoices for this subscription
    let invoices
    try {
      // We use `expand` to ensure we get the full line item objects,
      // including their period details, within the list call.
      invoices = await stripeServerClient.invoices.list({
        subscription: subId,
        status: 'paid',
        limit: 100,
        expand: ['data.lines.data'],
      })
    } catch (err: any) {
      if (err?.raw?.code === 'resource_missing') {
        console.warn(
          `Skipping subscription ${subId}: not found in this Stripe mode.`
        )
        continue
      }
      throw err
    }

    console.log(`  Found ${invoices.data.length} paid invoices.`)

    for (const invoice of invoices.data) {
      // The total amount paid for this invoice.
      const totalAmountPaid = invoice.amount_paid
      const paidAt = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(invoice.created * 1000)

      // Get the period from the subscription line item.
      // We identify it by checking the parent object's type.
      const subLineItem = invoice.lines.data.find(
        (line) =>
          line.parent?.type === 'subscription_item_details' && line.period
      )

      if (!subLineItem) {
        console.warn(
          `  Skipping Invoice ${invoice.id}: No line item found with type 'subscription_item_details' and a 'period'.`
        )
        continue
      }
      const periodStart = new Date(subLineItem.period.start * 1000)
      const year = periodStart.getUTCFullYear()
      const month = periodStart.getUTCMonth() + 1 // JS months are 0-based

      // Calculate the amount per student for this invoice.
      const amountPerStudent =
        studentsOnThisSub.length > 0
          ? Math.floor(totalAmountPaid / studentsOnThisSub.length)
          : totalAmountPaid // Fallback for safety

      console.log(
        `  Processing Invoice ${invoice.id} for ${year}-${month}. Total: $${totalAmountPaid / 100}, Per Student: $${amountPerStudent / 100}`
      )

      // Create a payment record for each student on the subscription.
      for (const student of studentsOnThisSub) {
        await prisma.studentPayment.upsert({
          where: {
            studentId_stripeInvoiceId: {
              studentId: student.id,
              stripeInvoiceId: invoice.id,
            },
          },
          update: {
            amountPaid: amountPerStudent,
            paidAt,
            year,
            month,
          },
          create: {
            studentId: student.id,
            stripeInvoiceId: invoice.id,
            year,
            month,
            amountPaid: amountPerStudent,
            paidAt,
          },
        })
        console.log(
          `    Upserted payment for ${student.name} (${year}-${month})`
        )
      }
    }
  }

  console.log('\n✅ Stripe payment import completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
