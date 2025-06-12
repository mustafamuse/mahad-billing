import { NextResponse } from 'next/server'

import type Stripe from 'stripe'
import { z } from 'zod'

import { prisma } from '@/lib/db'
import { stripeServerClient } from '@/lib/stripe'

const schema = z.object({
  year: z
    .number()
    .int()
    .min(2020)
    .max(new Date().getFullYear() + 1),
  month: z.number().int().min(1).max(12),
  batchIds: z.array(z.string()).optional(),
})

interface ExcludedCharge {
  studentName: string
  studentEmail: string
  customerEmail: string
  chargeAmount: number
  chargeId: string
  invoiceId: string | null
  payoutId: string
}

interface StudentInfo {
  studentName: string
  studentEmail: string
  customerEmail: string
  chargesFound: number
  batchId: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = schema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors },
        { status: 400 }
      )
    }

    const { year, month, batchIds = [] } = validation.data

    const emailsToExclude: string[] = []
    const exclusionLog: Record<string, StudentInfo> = {}
    const excludedCharges: ExcludedCharge[] = []
    const studentEmailToInfo: Record<
      string,
      { studentName: string; studentEmail: string; batchId: string }
    > = {}

    if (batchIds.length > 0) {
      const studentsInBatches = await prisma.student.findMany({
        where: {
          batchId: { in: batchIds },
          stripeSubscriptionId: { not: null },
          email: { not: null },
        },
        select: {
          name: true,
          email: true,
          stripeSubscriptionId: true,
          batchId: true,
        },
      })

      console.log(
        `Found ${studentsInBatches.length} students in selected batches`
      )

      const emailPromises = studentsInBatches.map(async (student) => {
        if (!student.stripeSubscriptionId || !student.email) {
          return null
        }
        try {
          const subscription = await stripeServerClient.subscriptions.retrieve(
            student.stripeSubscriptionId,
            { expand: ['customer'] }
          )

          const customer = subscription.customer as Stripe.Customer
          const customerEmail = customer.email

          if (customerEmail) {
            const studentName = student.name || student.email
            console.log(
              `Student ${studentName} (${student.email}) -> Customer email: ${customerEmail}`
            )
            studentEmailToInfo[customerEmail] = {
              studentName: studentName,
              studentEmail: student.email,
              batchId: student.batchId ?? '',
            }
            return customerEmail
          }
        } catch (error) {
          console.error(
            `Failed to retrieve subscription for ${student.email}:`,
            error
          )
        }
        return null
      })

      const resolvedEmails = await Promise.all(emailPromises)

      resolvedEmails.forEach((email) => {
        if (email && studentEmailToInfo[email]) {
          emailsToExclude.push(email)
          exclusionLog[email] = {
            studentName: studentEmailToInfo[email].studentName,
            studentEmail: studentEmailToInfo[email].studentEmail,
            customerEmail: email,
            chargesFound: 0,
            batchId: studentEmailToInfo[email].batchId ?? '',
          }
        }
      })

      console.log('Emails to exclude:', emailsToExclude)
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    let totalPayoutAmount = 0
    let totalDeductions = 0
    let payoutsFoundCount = 0

    const payoutParams: Stripe.PayoutListParams = {
      arrival_date: {
        gte: Math.floor(startDate.getTime() / 1000),
        lt: Math.floor(endDate.getTime() / 1000),
      },
      status: 'paid',
      limit: 100,
    }

    for await (const payout of stripeServerClient.payouts.list(payoutParams)) {
      payoutsFoundCount++
      totalPayoutAmount += payout.amount

      const balanceTransactions =
        await stripeServerClient.balanceTransactions.list({
          payout: payout.id,
          limit: 100,
          expand: ['data.source.customer'],
        })

      for (const txn of balanceTransactions.data) {
        if (txn.reporting_category === 'charge') {
          const charge = txn.source as Stripe.Charge
          if (charge.customer && charge.paid === true) {
            const customer = charge.customer as Stripe.Customer
            const customerEmail = customer.email

            if (customerEmail && emailsToExclude.includes(customerEmail)) {
              const studentInfo = studentEmailToInfo[customerEmail]

              console.log(
                `Excluding charge from ${customerEmail}, Net: $${(txn.net / 100).toFixed(2)}, Charge ID: ${charge.id}`
              )

              totalDeductions += txn.net
              if (exclusionLog[customerEmail]) {
                exclusionLog[customerEmail].chargesFound++
              }

              // Collect detailed charge information
              excludedCharges.push({
                studentName: studentInfo.studentName,
                studentEmail: studentInfo.studentEmail,
                customerEmail: customerEmail,
                chargeAmount: txn.net,
                chargeId: charge.id,
                invoiceId: (charge as any).invoice || null,
                payoutId: payout.id,
              })
            }
          }
        }
      }
    }

    console.log('\n--- Exclusion Summary ---')
    Object.entries(exclusionLog).forEach(([_, log]) => {
      console.log(
        `Student: ${log.studentName} (${log.studentEmail}) | Customer: ${log.customerEmail} | Charges Deducted: ${log.chargesFound} | Batch: ${log.batchId}`
      )
    })
    console.log('-----------------------\n')

    const finalAdjustedPayout = totalPayoutAmount - totalDeductions

    return NextResponse.json({
      totalPayoutAmount,
      totalDeductions,
      finalAdjustedPayout,
      payoutsFound: payoutsFoundCount,
      excludedCharges,
      exclusionSummary: Object.values(exclusionLog),
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred'
    console.error(`[PROFIT_SHARE_API_ERROR]`, errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
