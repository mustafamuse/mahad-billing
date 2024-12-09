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

  // Debug logs
  console.log('Raw Stats:', {
    monthlyRecurringRevenue: stats?.monthlyRecurringRevenue,
    potentialRevenue: stats?.potentialRevenue,
    totalStudents: stats?.totalStudents,
    discountImpact: stats?.discountImpact,
    revenueEfficiency: stats?.revenueEfficiency,
  })

  // Log calculations
  console.log('Calculations:', {
    revenueLost:
      (stats?.potentialRevenue || 0) - (stats?.monthlyRecurringRevenue || 0),
    avgRevenuePerStudent:
      (stats?.monthlyRecurringRevenue || 0) / (stats?.totalStudents || 1),
    isHighDiscountImpact: (stats?.discountImpact || 0) > 20,
    isLowRevenue:
      (stats?.monthlyRecurringRevenue || 0) / (stats?.totalStudents || 1) < 120,
  })

  // Calculate various metrics
  const isHighDiscountImpact = (stats?.discountImpact || 0) > 20
  const isLowRevenue =
    (stats?.monthlyRecurringRevenue || 0) / (stats?.totalStudents || 1) < 120
  const isHighChurn =
    ((stats?.canceledLastMonth || 0) / (stats?.totalStudents || 1)) * 100 > 10

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue Card */}
      <Card className={isLowRevenue ? 'border-orange-500' : ''}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              M.R.R
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
              Avg.{' '}
              {formatCurrency(
                (stats?.activeCount || 0) > 0
                  ? (stats?.monthlyRecurringRevenue || 0) /
                      (stats?.activeCount || 1)
                  : 0
              )}
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
                  Discount Impact
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {(stats?.discountImpact || 0).toFixed(1)}%
                  </div>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
              </div>
              {/* Revenue Realization */}
              <div className="text-right">
                <div className="mb-1 text-sm text-muted-foreground">
                  Revenue Realization
                </div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {(stats?.revenueEfficiency || 0).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Revenue Details */}
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="text-muted-foreground">
                    Unrealized Revenue
                  </div>
                  <div className="font-medium">
                    {formatCurrency(
                      (stats?.actualPotentialRevenue || 0) -
                        (stats?.monthlyRecurringRevenue || 0)
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Potential Revenue</div>
                  <div className="font-medium">
                    {formatCurrency(stats?.actualPotentialRevenue || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Overdue Payments Card */}
      <Card
        className={(stats?.overduePayments || 0) > 0 ? 'border-red-500' : ''}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Payment Status
            </div>
            {(stats?.overduePayments || 0) > 0 && (
              <Clock className="h-5 w-5 text-red-500" />
            )}
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
            <div className="text-3xl font-bold">
              {(
                ((stats?.canceledLastMonth || 0) /
                  (stats?.totalStudents || 1)) *
                100
              ).toFixed(1)}
              %
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stats?.canceledLastMonth || 0} cancellations this month
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
