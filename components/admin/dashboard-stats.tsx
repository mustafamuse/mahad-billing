"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  AlertTriangle, 
  TrendingDown, 
  DollarSign,
  Users,
  Clock,
  AlertCircle
} from "lucide-react";
import type { DashboardStats } from "@/lib/types";

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  // Calculate various metrics
  const discountImpact = ((stats?.potentialRevenue || 0) - (stats?.monthlyRecurringRevenue || 0)) / (stats?.potentialRevenue || 1) * 100;
  const isHighDiscountImpact = discountImpact > 20;
  
  const averageRevenuePerStudent = (stats?.monthlyRecurringRevenue || 0) / (stats?.totalStudents || 1);
  const isLowAverageRevenue = averageRevenuePerStudent < 120; // Alert if average is below $120

  const hasOverduePayments = (stats?.overduePayments || 0) > 0;
  const churnRate = ((stats?.canceledLastMonth || 0) / (stats?.totalActiveSubscriptions || 1)) * 100;
  const isHighChurn = churnRate > 10; // Alert if churn rate is above 10%

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue Card */}
      <Card className={isLowAverageRevenue ? "border-orange-500" : ""}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </div>
            {isLowAverageRevenue && (
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

      {/* Discount Impact Card */}
      <Card className={isHighDiscountImpact ? "border-yellow-500" : ""}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Discount Impact
            </div>
            {isHighDiscountImpact && (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold flex items-center gap-2">
              {discountImpact.toFixed(1)}%
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Lost: {formatCurrency((stats?.potentialRevenue || 0) - (stats?.monthlyRecurringRevenue || 0))}
            </div>
          </div>
        </div>
      </Card>

      {/* Overdue Payments Card */}
      <Card className={hasOverduePayments ? "border-red-500" : ""}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Payment Status
            </div>
            {hasOverduePayments && (
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
      <Card className={isHighChurn ? "border-red-500" : ""}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Student Retention
            </div>
            {isHighChurn && (
              <Users className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold">
              {churnRate.toFixed(1)}%
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {stats?.canceledLastMonth || 0} cancellations this month
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 