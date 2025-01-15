import Stripe from 'stripe'

import { BASE_RATE, STUDENTS } from '@/lib/data'
import { TableStudent } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

import { stripeServerClient } from '../utils/stripe'

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-green-600 dark:text-green-400'
    case 'past_due':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'unpaid':
      return 'text-red-600 dark:text-red-400'
    case 'canceled':
      return 'text-gray-600 dark:text-gray-400'
    default:
      return 'text-muted-foreground'
  }
}

function formatDiscountDisplay(type: string, amount: number): string {
  if (type === 'Family Discount') {
    return `Fam ($${amount} off)`
  }
  return type
}

function getDiscountBadgeVariant(
  type: string
): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'Family Discount':
      return 'secondary'
    case 'None':
      return 'outline'
    default:
      return 'default'
  }
}

export async function getDashboardData(): Promise<{
  students: TableStudent[]
  totalCount: number
  activeCount: number
  unenrolledCount: number
  metrics: {
    totalRevenue: number
    averageRevenue: number
    discountTotal: number
    discountPercentage: number
  }
}> {
  try {
    // Fetch active subscriptions
    const subscriptions = await stripeServerClient.subscriptions.list({
      expand: ['data.customer'],
      limit: 100,
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
        students.forEach((student: { name: string }) => {
          subscribedStudentsMap.set(student.name, {
            subscription,
            customer: subscription.customer as Stripe.Customer,
          })
        })
      } catch (e) {
        console.error('Error parsing students metadata:', e)
      }
    })

    // Process students
    const processedStudents: TableStudent[] = STUDENTS.map((student, index) => {
      const subscriptionData = subscribedStudentsMap.get(student.name)
      const status = subscriptionData?.subscription?.status || 'not_enrolled'

      const tableStudent: TableStudent = {
        ...student,
        id: student.id,
        name: student.name,
        subscriptionId: subscriptionData?.subscription?.id || null,
        status,
        currentPeriodEnd:
          subscriptionData?.subscription?.current_period_end || null,
        guardian: subscriptionData
          ? {
              id: subscriptionData.customer.id,
              name: subscriptionData.customer.name || null,
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
        revenue: {
          monthly: subscriptionData ? student.monthlyRate : 0,
          annual: subscriptionData ? student.monthlyRate * 12 : 0,
          lifetime: 0,
        },
        isEnrolled: !!subscriptionData,
        // Table-specific fields
        rowNumber: index + 1,
        displayAmount: formatCurrency(student.monthlyRate),
        displayDiscount: formatDiscountDisplay(
          student.familyId ? 'Family Discount' : 'None',
          BASE_RATE - student.monthlyRate
        ),
        displayStatus:
          status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        displayDate: subscriptionData?.subscription?.current_period_end
          ? formatDate(subscriptionData.subscription.current_period_end * 1000)
          : undefined,
        statusColor: getStatusColor(status),
        discountBadgeVariant: getDiscountBadgeVariant(
          student.familyId ? 'Family Discount' : 'None'
        ),
      }

      return tableStudent
    })

    // Calculate metrics
    const activeStudents = processedStudents.filter(
      (s) => s.status === 'active'
    )
    const unenrolledStudents = processedStudents.filter((s) => !s.isEnrolled)

    const totalRevenue = activeStudents.reduce(
      (sum, s) => sum + s.monthlyAmount,
      0
    )
    const averageRevenue =
      activeStudents.length > 0 ? totalRevenue / activeStudents.length : 0
    const discountTotal = processedStudents.reduce(
      (sum, s) => sum + s.discount.amount,
      0
    )
    const discountPercentage =
      (discountTotal / (processedStudents.length * BASE_RATE)) * 100

    return {
      students: processedStudents,
      totalCount: processedStudents.length,
      activeCount: activeStudents.length,
      unenrolledCount: unenrolledStudents.length,
      metrics: {
        totalRevenue,
        averageRevenue,
        discountTotal,
        discountPercentage,
      },
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error
  }
}
