import { NextResponse } from 'next/server'

import Stripe from 'stripe'
import { z } from 'zod'

import { BASE_RATE, STUDENTS } from '@/lib/data'
import { Student } from '@/lib/types'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  status: z.string().optional(),
  search: z.string().optional(),
  discountType: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryResult = QuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, limit, status, search, discountType, sortBy, sortOrder } =
      queryResult.data

    // Fetch active subscriptions
    const subscriptions = await stripe.subscriptions
      .list({
        expand: ['data.customer'],
        limit: 100,
      })
      .catch((error) => {
        console.error('Stripe API error:', error)
        throw new Error('Failed to fetch subscriptions')
      })

    // Create subscription lookup map
    const subscribedStudentsMap = new Map<
      string,
      {
        subscription: Stripe.Subscription
        customer: Stripe.Customer
      }
    >()

    subscriptions.data.forEach((subscription) => {
      const metadata = subscription.metadata || {}
      try {
        const students = JSON.parse(metadata.students || '[]')
        students.forEach((student: Student) => {
          subscribedStudentsMap.set(student.name, {
            subscription,
            customer: subscription.customer as Stripe.Customer,
          })
        })
      } catch (e) {
        console.error('Error parsing students metadata:', e)
      }
    })

    // First get all not enrolled students before any filtering
    const allUnenrolledStudents = STUDENTS.filter(
      (student) => !subscribedStudentsMap.has(student.name)
    )
    const totalUnenrolledCount = allUnenrolledStudents.length

    // Process students and apply initial filters
    let processedStudents = STUDENTS.map((student) => {
      const subscriptionData = subscribedStudentsMap.get(student.name)

      return {
        id: student.id,
        name: student.name,
        subscriptionId: subscriptionData?.subscription?.id || null,
        status: subscriptionData?.subscription?.status || 'not_enrolled',
        currentPeriodEnd:
          subscriptionData?.subscription?.current_period_end || null,
        guardian: subscriptionData
          ? {
              id: subscriptionData.customer.id,
              name: subscriptionData.customer.name,
              email: subscriptionData.customer.email,
            }
          : { id: '', name: null, email: null },
        monthlyAmount: student.monthlyRate,
        discount: {
          amount: BASE_RATE - student.monthlyRate,
          type: student.familyId ? 'Family Discount' : 'None',
          percentage: student.familyId
            ? ((BASE_RATE - student.monthlyRate) / BASE_RATE) * 100
            : 0,
        },
        familyId: student.familyId,
        totalFamilyMembers: student.totalFamilyMembers,
        revenue: {
          monthly: subscriptionData ? student.monthlyRate : 0,
          annual: subscriptionData ? student.monthlyRate * 12 : 0,
          lifetime: 0,
        },
        isEnrolled: !!subscriptionData,
      }
    })

    // Apply search filter if any
    if (search) {
      const searchLower = search.toLowerCase()
      processedStudents = processedStudents.filter((student) =>
        student.name.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (status && status !== 'all') {
      processedStudents = processedStudents.filter((student) =>
        status === 'not_enrolled'
          ? !student.isEnrolled
          : student.status === status
      )
    }

    // Get filtered students by status
    const activeStudents = processedStudents.filter(
      (s) => s.status === 'active'
    )
    const unenrolledStudents = processedStudents.filter(
      (s) => s.status === 'not_enrolled'
    )
    const pastDueStudents = processedStudents.filter(
      (s) => s.status === 'past_due' || s.status === 'unpaid'
    )
    const canceledStudents = processedStudents.filter(
      (s) => s.status === 'canceled'
    )

    // Apply discount filter
    if (discountType && discountType !== 'all') {
      processedStudents = processedStudents.filter(
        (student) => student.discount.type === discountType
      )
    }

    // Calculate metrics
    const activeCount = activeStudents.length
    const notEnrolledWithFamilyDiscount = unenrolledStudents.filter(
      (s) => s.discount.type === 'Family Discount'
    ).length
    const notEnrolledFamilyDiscountTotal = unenrolledStudents
      .filter((s) => s.discount.type === 'Family Discount')
      .reduce((sum, s) => sum + s.discount.amount, 0)

    // Calculate base metrics
    const activeRevenue = activeStudents.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    )
    const pastDueRevenue = pastDueStudents.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    )
    const canceledRevenue = canceledStudents.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    )

    // Calculate averages
    const averageActiveAmount =
      activeCount > 0 ? activeRevenue / activeCount : 0
    const averagePastDueAmount =
      pastDueStudents.length > 0 ? pastDueRevenue / pastDueStudents.length : 0

    // Calculate family discount metrics
    const activeWithFamilyDiscount = activeStudents.filter(
      (s) => s.discount.type === 'Family Discount'
    ).length
    const activeFamilyDiscountTotal = activeStudents
      .filter((s) => s.discount.type === 'Family Discount')
      .reduce((sum, s) => sum + s.discount.amount, 0)
    const averageActiveFamilyDiscount =
      activeWithFamilyDiscount > 0
        ? activeFamilyDiscountTotal / activeWithFamilyDiscount
        : 0

    // Calculate no discount metrics
    const activeNoDiscountCount = activeStudents.filter(
      (s) => s.discount.type === 'None'
    ).length
    const activeNoDiscountRevenue = activeStudents
      .filter((s) => s.discount.type === 'None')
      .reduce((sum, s) => sum + s.monthlyAmount, 0)

    // Calculate not enrolled metrics
    const notEnrolledNoDiscountCount = unenrolledStudents.filter(
      (s) => s.discount.type === 'None'
    ).length
    const notEnrolledNoDiscountRevenue = unenrolledStudents
      .filter((s) => s.discount.type === 'None')
      .reduce((sum, s) => sum + s.monthlyAmount, 0)

    // Calculate revenue metrics
    const potentialRevenue = STUDENTS.length * BASE_RATE
    const actualRevenue = activeRevenue
    const totalDiscounts = STUDENTS.reduce(
      (total, student) => total + (BASE_RATE - student.monthlyRate),
      0
    )
    const revenueEfficiency = (actualRevenue / potentialRevenue) * 100
    const discountImpact = (totalDiscounts / potentialRevenue) * 100

    // Calculate not enrolled revenue metrics
    const notEnrolledPotentialRevenue = unenrolledStudents.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    )
    const notEnrolledTotalDiscounts = unenrolledStudents.reduce(
      (sum, s) => sum + (BASE_RATE - s.monthlyAmount),
      0
    )
    const notEnrolledBaseRateRevenue = unenrolledStudents.length * BASE_RATE

    // Calculate canceled metrics
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthCanceled = canceledStudents.filter((student) => {
      if (!student.currentPeriodEnd) return false
      const cancelDate = new Date(student.currentPeriodEnd * 1000)
      return cancelDate >= lastMonth && cancelDate <= now
    }).length

    // Apply pagination
    const start = (page - 1) * limit
    const paginatedStudents = processedStudents.slice(start, start + limit)
    const hasMore = start + limit < processedStudents.length
    const nextCursor = hasMore ? processedStudents[start + limit - 1].id : null

    return NextResponse.json(
      {
        students: paginatedStudents,
        hasMore,
        nextCursor,
        totalStudents: STUDENTS.length,
        filteredCount: processedStudents.length,
        // Base counts
        activeCount,
        unenrolledCount: totalUnenrolledCount,
        // Active metrics
        activeRevenue,
        averageActiveAmount,
        activeWithFamilyDiscount,
        activeFamilyDiscountTotal,
        averageActiveFamilyDiscount,
        activeNoDiscountCount,
        activeNoDiscountRevenue,
        // Not enrolled metrics
        notEnrolledWithFamilyDiscount,
        notEnrolledFamilyDiscountTotal,
        notEnrolledNoDiscountCount,
        notEnrolledNoDiscountRevenue,
        // Revenue metrics
        potentialRevenue,
        actualRevenue,
        totalDiscounts,
        discountImpact,
        revenueEfficiency,
        notEnrolledPotentialRevenue,
        notEnrolledTotalDiscounts,
        notEnrolledBaseRateRevenue,
        // Other metrics
        pastDueCount: pastDueStudents.length,
        pastDueRevenue,
        averagePastDueAmount,
        canceledCount: canceledStudents.length,
        canceledRevenue,
        lastMonthCanceled,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
          Vary: 'Authorization',
        },
      }
    )
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
