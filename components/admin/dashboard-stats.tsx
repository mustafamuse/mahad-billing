'use client'

import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  TrendingDown,
  Users,
  Clock,
  AlertCircle,
} from 'lucide-react'

import { Card } from '@/components/ui/card'
import type { DashboardStats } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

import { DashboardStatsSkeleton } from './dashboard-stats-skeleton'

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
  })

  if (isLoading) {
    return <DashboardStatsSkeleton />
  }

  // Calculate various metrics
  const discountImpact =
    (((stats?.potentialRevenue || 0) - (stats?.monthlyRecurringRevenue || 0)) /
      (stats?.potentialRevenue || 1)) *
    100
  const isHighDiscountImpact = discountImpact > 20

  const averageRevenuePerStudent =
    (stats?.monthlyRecurringRevenue || 0) / (stats?.totalStudents || 1)
  const isLowRevenue = averageRevenuePerStudent < 120 // Alert if below $120

  const revenueEfficiency =
    ((stats?.monthlyRecurringRevenue || 0) / (stats?.potentialRevenue || 1)) *
    100

  const hasOverduePayments = (stats?.overduePayments || 0) > 0
  const churnRate =
    ((stats?.canceledLastMonth || 0) / (stats?.totalStudents || 1)) * 100
  const isHighChurn = churnRate > 10 // Alert if churn rate is above 10%

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue Card */}
      <Card className={isLowRevenue ? 'border-orange-500' : ''}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </div>
            {isLowRevenue && (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold">
              {formatCurrency(stats?.monthlyRecurringRevenue || 0)}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Avg. {formatCurrency(averageRevenuePerStudent)}/student
            </div>
          </div>
        </div>
      </Card>

      {/* Revenue Performance Card */}
      <Card className={isHighDiscountImpact ? 'border-yellow-500' : ''}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Revenue Performance
            </div>
            {isHighDiscountImpact && (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <div className="mt-4">
            {/* Main Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {/* Discount Impact */}
              <div>
                <div className="mb-1 text-sm text-muted-foreground">
                  Lost to Discounts
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {discountImpact.toFixed(1)}%
                  </div>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
              </div>
              {/* Revenue Efficiency */}
              <div className="text-right">
                <div className="mb-1 text-sm text-muted-foreground">
                  Revenue Efficiency
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {revenueEfficiency.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Revenue Details */}
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-muted-foreground">Monthly Revenue</div>
                  <div className="font-medium">
                    {formatCurrency(stats?.monthlyRecurringRevenue || 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Potential Revenue</div>
                  <div className="font-medium">
                    {formatCurrency(stats?.potentialRevenue || 0)}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                Revenue lost:{' '}
                {formatCurrency(
                  (stats?.potentialRevenue || 0) -
                    (stats?.monthlyRecurringRevenue || 0)
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Overdue Payments Card */}
      <Card className={hasOverduePayments ? 'border-red-500' : ''}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Payment Status
            </div>
            {hasOverduePayments && <Clock className="h-5 w-5 text-red-500" />}
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold">
              {stats?.overduePayments || 0}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Overdue Payments
            </div>
          </div>
        </div>
      </Card>

      {/* Churn Rate Card */}
      <Card className={isHighChurn ? 'border-red-500' : ''}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Student Retention
            </div>
            {isHighChurn && <Users className="h-5 w-5 text-red-500" />}
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold">{churnRate.toFixed(1)}%</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stats?.canceledLastMonth || 0} cancellations this month
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
