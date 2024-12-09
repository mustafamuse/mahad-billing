'use client'

import { useQuery } from '@tanstack/react-query'
import { DollarSign, BarChart2, PieChart, Clock, Users } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* M.R.R Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <CardContent className="pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">M.R.R</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(stats?.monthlyRecurringRevenue || 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg.{' '}
            {formatCurrency(
              (stats?.activeCount || 0) > 0
                ? (stats?.monthlyRecurringRevenue || 0) /
                    (stats?.activeCount || 1)
                : 0
            )}
          </p>
        </CardContent>
      </Card>

      {/* Revenue Performance Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background">
        <CardContent className="pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Revenue Performance</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
              <BarChart2 className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Discount Impact</p>
              <p className="text-lg font-bold text-destructive">
                {(stats?.discountImpact || 0).toFixed(1)}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Revenue Realization
              </p>
              <p className="text-lg font-bold text-emerald-600">
                {(stats?.revenueEfficiency || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Potential Card */}
      <Card className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-background">
        <CardContent className="pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Revenue Potential</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
              <PieChart className="h-4 w-4 text-indigo-500" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Unrealized</span>
              <span className="font-medium">
                {formatCurrency(
                  (stats?.actualPotentialRevenue || 0) -
                    (stats?.monthlyRecurringRevenue || 0)
                )}
              </span>
            </div>
            <Progress
              value={
                ((stats?.monthlyRecurringRevenue || 0) /
                  (stats?.actualPotentialRevenue || 1)) *
                100
              }
              className="h-1"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Potential</span>
              <span className="font-medium">
                {formatCurrency(stats?.actualPotentialRevenue || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Card */}
      <Card className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-background">
        <CardContent className="pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Payment Status</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {stats?.overduePayments || 0}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Overdue Payments</p>
        </CardContent>
      </Card>

      {/* Student Retention Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background">
        <CardContent className="pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Student Retention</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {(
              ((stats?.canceledLastMonth || 0) / (stats?.totalStudents || 1)) *
              100
            ).toFixed(1)}
            %
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats?.canceledLastMonth || 0} cancellations
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
