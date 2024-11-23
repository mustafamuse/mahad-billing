"use client";

import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/admin/dashboard-header";
import { DashboardStats } from "@/components/admin/dashboard-stats";
// import { FinancialInsights } from "@/components/admin/financial-insights";
import { SubscriptionTable } from "@/components/admin/subscription-table";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStats as DashboardStatsType } from "@/lib/types";

// Create a client
const queryClient = new QueryClient();

function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStatsType>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader />
      
      <Suspense fallback={<div>Loading stats...</div>}>
        <DashboardStats />
      </Suspense>

      {/* Commented out Financial Insights for future use
      {stats && (
        <Suspense fallback={<div>Loading insights...</div>}>
          <FinancialInsights stats={stats} />
        </Suspense>
      )} */}

      <Card className="mt-8">
        <div className="p-6">
          <Suspense fallback={<div>Loading subscriptions...</div>}>
            <SubscriptionTable />
          </Suspense>
        </div>
      </Card>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
} 