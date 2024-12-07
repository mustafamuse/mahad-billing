import { NextResponse } from 'next/server'

import Stripe from 'stripe'

import { BASE_RATE } from '@/lib/data'
import { Student } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET() {
  try {
    const now = new Date()
    const _firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const _lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

    // Get active subscriptions
    const activeSubscriptions = await stripe.subscriptions.list({
      status: 'active',
      expand: ['data.customer'],
    })

    // Get payment history
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: Math.floor(threeMonthsAgo.getTime() / 1000),
      },
      expand: ['data.customer'],
    })

    // Track payment patterns by customer
    const customerPayments: Record<
      string,
      {
        onTime: number
        late: number
        failed: number
        totalAmount: number
        lastPaymentDate?: number
      }
    > = {}

    // Track payment method stats
    const paymentMethodStats = {
      ach: { total: 0, successful: 0, rate: 0 },
      card: { total: 0, successful: 0, rate: 0 },
    }

    // Process payment intents
    paymentIntents.data.forEach((pi) => {
      const customerId = (pi.customer as Stripe.Customer).id
      if (!customerPayments[customerId]) {
        customerPayments[customerId] = {
          onTime: 0,
          late: 0,
          failed: 0,
          totalAmount: 0,
        }
      }

      if (pi.status === 'succeeded') {
        const dueDate = new Date(pi.created * 1000)
        dueDate.setDate(1) // Assuming payments are due on the 1st
        const paidDate = new Date(pi.created * 1000)

        if (paidDate.getTime() > dueDate.getTime() + 3 * 24 * 60 * 60 * 1000) {
          // 3 days grace period
          customerPayments[customerId].late++
        } else {
          customerPayments[customerId].onTime++
        }
        customerPayments[customerId].totalAmount += pi.amount
        customerPayments[customerId].lastPaymentDate = pi.created
      } else if (
        pi.status === 'requires_payment_method' ||
        pi.status === 'canceled'
      ) {
        // Count failed or canceled payments
        customerPayments[customerId].failed++
      }

      // Track payment method stats
      const paymentMethodType = pi.payment_method_types[0]
      if (paymentMethodType === 'us_bank_account') {
        paymentMethodStats.ach.total++
        if (pi.status === 'succeeded') {
          paymentMethodStats.ach.successful++
        }
      } else if (paymentMethodType === 'card') {
        paymentMethodStats.card.total++
        if (pi.status === 'succeeded') {
          paymentMethodStats.card.successful++
        }
      }
    })

    // Calculate basic stats
    const totalActiveSubscriptions = activeSubscriptions.data.length
    let totalStudents = 0
    let monthlyRecurringRevenue = 0
    let potentialRevenue = 0

    activeSubscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata
      const students = JSON.parse(metadata.students || '[]')
      totalStudents += students.length

      students.forEach((student: Student) => {
        monthlyRecurringRevenue += student.monthlyRate
        potentialRevenue += BASE_RATE // This is correct - keeps using BASE_RATE for potential
      })
    })

    // Calculate payment pattern stats
    const paymentPatterns = {
      totalLatePayments: Object.values(customerPayments).reduce(
        (sum, cp) => sum + cp.late,
        0
      ),
      customersWithLatePayments: Object.values(customerPayments).filter(
        (cp) => cp.late > 0
      ).length,
      averagePaymentDelay:
        Object.values(customerPayments).reduce(
          (sum, cp) => sum + (cp.late / (cp.late + cp.onTime) || 0),
          0
        ) / Object.keys(customerPayments).length,
      riskiestCustomers: Object.entries(customerPayments)
        .filter(([_, cp]) => cp.late > 0 || cp.failed > 0)
        .map(([id, cp]) => ({
          customerId: id,
          customerName: 'Unknown', // You might want to fetch this from Stripe customer data
          paymentHistory: {
            onTimePayments: cp.onTime,
            latePayments: cp.late,
            failedPayments: cp.failed,
            averageDelayDays: 0, // Calculate this if needed
          },
          riskScore:
            ((cp.late * 10 + cp.failed * 20) /
              (cp.late + cp.onTime + cp.failed)) *
            100,
          paymentMethodSuccess: {
            total: cp.onTime + cp.late + cp.failed,
            successful: cp.onTime,
            successRate: cp.onTime / (cp.onTime + cp.late + cp.failed),
          },
          flags: {
            isFrequentlyLate: cp.late > 2,
            hasMultipleFailures: cp.failed > 1,
            isHighRisk:
              ((cp.late * 10 + cp.failed * 20) /
                (cp.late + cp.onTime + cp.failed)) *
                100 >
              50,
          },
        }))
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5),
      paymentMethodStats,
    }

    // Calculate financial health metrics
    const monthlyRevenues = Object.values(customerPayments).reduce(
      (acc, cp) => {
        if (cp.lastPaymentDate) {
          const month = new Date(cp.lastPaymentDate * 1000).getMonth()
          acc[month] = (acc[month] || 0) + cp.totalAmount
        }
        return acc
      },
      {} as Record<number, number>
    )

    // Calculate rates before returning response
    paymentMethodStats.ach.rate =
      paymentMethodStats.ach.total > 0
        ? paymentMethodStats.ach.successful / paymentMethodStats.ach.total
        : 0

    paymentMethodStats.card.rate =
      paymentMethodStats.card.total > 0
        ? paymentMethodStats.card.successful / paymentMethodStats.card.total
        : 0

    const revenueValues = Object.values(monthlyRevenues)
    const averageRevenue =
      revenueValues.length > 0
        ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length
        : 0
    const revenueVolatility =
      revenueValues.length > 0
        ? Math.sqrt(
            revenueValues.reduce(
              (sum, rev) => sum + Math.pow(rev - averageRevenue, 2),
              0
            ) / revenueValues.length
          ) / (averageRevenue || 1)
        : 0

    return NextResponse.json({
      totalActiveSubscriptions,
      totalStudents,
      monthlyRecurringRevenue,
      potentialRevenue,
      paymentPatterns,
      financialHealth: {
        revenueStability: {
          score: Math.max(0, 100 - revenueVolatility * 100),
          trend:
            revenueValues[revenueValues.length - 1] > averageRevenue
              ? 'increasing'
              : 'decreasing',
          volatility: revenueVolatility,
        },
        cashFlow: {
          currentMonth: monthlyRecurringRevenue,
          nextMonthPrediction:
            monthlyRecurringRevenue * (1 + (revenueVolatility || 0)),
          predictedGrowth: (revenueVolatility || 0) * 100,
          riskFactors: [],
        },
        revenueTargets: {
          monthlyTarget: monthlyRecurringRevenue * 1.1, // 10% growth target
          currentProgress: 100, // Calculate this based on your business logic
          projectedRevenue:
            monthlyRecurringRevenue * (1 + (revenueVolatility || 0)),
          shortfall: Math.max(
            0,
            monthlyRecurringRevenue * 1.1 - monthlyRecurringRevenue
          ),
          isOnTrack: true,
        },
      },
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
