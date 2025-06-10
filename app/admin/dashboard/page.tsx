'use client'

import { Suspense } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { DashboardHeader } from '@/app/admin/dashboard/dashboard-header'
import { DashboardStats } from '@/app/admin/dashboard/dashboard-stats'
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

      <div className="rounded-lg border bg-background p-6">
        <div className="text-center text-muted-foreground">
          <p>Subscription table component is being rebuilt.</p>
        </div>
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
