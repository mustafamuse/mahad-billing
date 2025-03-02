'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StudentSubscription } from '@/lib/types/subscriptions'

interface SubscriptionsTableProps {
  batchId: string | null
}

export function SubscriptionsTable({ batchId }: SubscriptionsTableProps) {
  const { data, isLoading, error } = useQuery<StudentSubscription[]>({
    queryKey: ['subscriptions', batchId],
    queryFn: async () => {
      const response = await fetch(
        batchId
          ? `/api/admin/subscriptions?batchId=${batchId}`
          : '/api/admin/subscriptions'
      )
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
      }
      return response.json()
    },
    // Cache the data for 5 minutes (300000 milliseconds)
    staleTime: 300000,
    // Keep the cached data for 10 minutes even if unused
    gcTime: 600000,
    // Refetch in the background if data is older than 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: 'always',
    // Add a retry mechanism for failed requests
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  if (error) {
    return (
      <div className="rounded-md border p-4">
        <div className="text-red-500">Error loading subscriptions</div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-md border p-4">
        <div>Loading...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border p-4">
        <div className="text-center text-muted-foreground">
          No subscriptions found
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Payment</TableHead>
            <TableHead>Next Payment</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sub) => (
            <TableRow key={sub.student.id}>
              <TableCell className="font-medium">{sub.student.name}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    sub.subscription?.status === 'ACTIVE'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {sub.subscription?.status || 'NO SUBSCRIPTION'}
                </Badge>
              </TableCell>
              <TableCell>
                {sub.subscription?.lastPaymentDate
                  ? new Date(
                      sub.subscription.lastPaymentDate
                    ).toLocaleDateString()
                  : 'Never'}
              </TableCell>
              <TableCell>
                {sub.subscription?.nextPaymentDate
                  ? new Date(
                      sub.subscription.nextPaymentDate
                    ).toLocaleDateString()
                  : 'N/A'}
              </TableCell>
              <TableCell>
                {sub.subscription && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`https://dashboard.stripe.com/subscriptions/${sub.subscription.stripeSubscriptionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View in Stripe
                    </Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
