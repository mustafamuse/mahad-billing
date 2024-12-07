'use client'

import { Suspense } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { DashboardHeader } from '@/components/admin/dashboard-header'
import { DashboardStats } from '@/components/admin/dashboard-stats'
import { PaymentMonitoring } from '@/components/admin/payment-monitoring'
import { PaymentStatusTracker } from '@/components/admin/payment-status-tracker'
import { SubscriptionTable } from '@/components/admin/subscription-table'
import { ErrorBoundary } from '@/components/error-boundary'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function AdminDashboard() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <DashboardHeader />

      <ErrorBoundary>
        <Suspense
          fallback={
            <LoadingSpinner
              size="lg"
              text="Loading dashboard statistics..."
              className="min-h-[200px]"
            />
          }
        >
          <DashboardStats />
        </Suspense>
      </ErrorBoundary>

      <div className="grid gap-8 md:grid-cols-2">
        <PaymentStatusTracker />
        <PaymentMonitoring />
      </div>

      <div className="rounded-lg border bg-background">
        <SubscriptionTable />
      </div>
    </div>
  )
}

export default function AdminDashboardLayout() {
  return (
    <Providers>
      <AdminDashboard />
    </Providers>
  )
}
