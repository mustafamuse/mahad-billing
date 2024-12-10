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

    // Process all students
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
          : {
              id: '',
              name: null,
              email: null,
            },
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

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      processedStudents = processedStudents.filter((student) =>
        student.name.toLowerCase().includes(searchLower)
      )
    }

    if (status && status !== 'all') {
      processedStudents = processedStudents.filter((student) =>
        status === 'not_enrolled'
          ? !student.isEnrolled
          : student.status === status
      )
    }

    if (discountType && discountType !== 'all') {
      processedStudents = processedStudents.filter(
        (student) => student.discount.type === discountType
      )
    }

    // Apply sorting
    if (sortBy) {
      processedStudents.sort((a, b) => {
        switch (sortBy) {
          case 'amount':
            if (a.status === 'not_enrolled' && b.status !== 'not_enrolled')
              return 1
            if (a.status !== 'not_enrolled' && b.status === 'not_enrolled')
              return -1
            return sortOrder === 'desc'
              ? b.monthlyAmount - a.monthlyAmount
              : a.monthlyAmount - b.monthlyAmount
          case 'name':
            return sortOrder === 'desc'
              ? b.name.localeCompare(a.name)
              : a.name.localeCompare(b.name)
          case 'status':
            return sortOrder === 'desc'
              ? b.status.localeCompare(a.status)
              : a.status.localeCompare(b.status)
          case 'discount':
            if (a.discount.amount === 0 && b.discount.amount > 0) return 1
            if (a.discount.amount > 0 && b.discount.amount === 0) return -1
            return sortOrder === 'desc'
              ? b.discount.amount - a.discount.amount
              : a.discount.amount - b.discount.amount
          default:
            return 0
        }
      })
    }

    // Calculate metrics
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
    const familyDiscountStudents = processedStudents.filter(
      (s) => s.discount.type === 'Family Discount'
    )
    const noDiscountStudents = processedStudents.filter(
      (s) => s.discount.type === 'None'
    )

    // Calculate revenues
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
    const familyDiscountTotal = familyDiscountStudents.reduce(
      (sum, s) => sum + s.discount.amount,
      0
    )
    const noDiscountRevenue = noDiscountStudents.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    )

    // Calculate averages
    const averageActiveRevenue =
      activeStudents.length > 0 ? activeRevenue / activeStudents.length : 0
    const averagePastDueAmount =
      pastDueStudents.length > 0 ? pastDueRevenue / pastDueStudents.length : 0
    const averageFamilyDiscount =
      familyDiscountStudents.length > 0
        ? familyDiscountTotal / familyDiscountStudents.length
        : 0

    // Calculate canceled metrics
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthCanceled = canceledStudents.filter((student) => {
      if (!student.currentPeriodEnd) return false
      const cancelDate = new Date(student.currentPeriodEnd * 1000)
      return cancelDate >= lastMonth && cancelDate <= now
    }).length

    // Calculate potential monthly revenue for not enrolled students
    const notEnrolledPotentialRevenue = unenrolledStudents.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    )

    // Calculate total potential discounts for not enrolled students
    const notEnrolledTotalDiscounts = unenrolledStudents.reduce(
      (sum, s) => sum + (BASE_RATE - s.monthlyAmount),
      0
    )

    // Calculate base rate revenue for not enrolled students
    const notEnrolledBaseRateRevenue = unenrolledStudents.length * BASE_RATE

    // Apply pagination
    const start = (page - 1) * limit
    const paginatedStudents = processedStudents.slice(start, start + limit)
    const hasMore = start + limit < processedStudents.length
    const nextCursor = hasMore ? processedStudents[start + limit - 1].id : null

    // Calculate potential revenue if everyone paid full price (BASE_RATE)
    const potentialRevenue = STUDENTS.length * BASE_RATE

    // Calculate actual revenue we're getting (with discounts)
    const actualRevenue = activeRevenue

    // Calculate total discounts (difference between potential and what they would pay)
    const totalDiscounts = STUDENTS.reduce((total, student) => {
      return total + (BASE_RATE - student.monthlyRate)
    }, 0)

    // Calculate revenue efficiency (what percentage of BASE_RATE we're collecting)
    const revenueEfficiency = (actualRevenue / potentialRevenue) * 100

    // Calculate discount impact percentage
    const discountImpact = (totalDiscounts / potentialRevenue) * 100

    return NextResponse.json(
      {
        students: paginatedStudents,
        hasMore,
        nextCursor,
        totalStudents: STUDENTS.length,
        filteredCount: processedStudents.length,
        activeCount: activeStudents.length,
        activeRevenue,
        potentialRevenue,
        actualRevenue,
        totalDiscounts,
        discountImpact,
        revenueEfficiency,
        averageActiveRevenue,
        unenrolledCount: unenrolledStudents.length,
        pastDueCount: pastDueStudents.length,
        pastDueRevenue,
        averagePastDueAmount,
        canceledCount: canceledStudents.length,
        canceledRevenue,
        lastMonthCanceled,
        familyDiscountCount: familyDiscountStudents.length,
        familyDiscountTotal,
        averageFamilyDiscount,
        noDiscountCount: noDiscountStudents.length,
        noDiscountRevenue,
        notEnrolledPotentialRevenue,
        notEnrolledTotalDiscounts,
        notEnrolledBaseRateRevenue,
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
