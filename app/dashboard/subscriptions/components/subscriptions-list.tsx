'use client'

import Link from 'next/link'

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

interface SubscriptionsListProps {
  subscriptions: Array<{
    student: {
      id: string
      name: string
      email: string | null
    } | null
    stripeSubscription: {
      subscriptionId: string
      status: string
      customerEmail: string
      customerName: string
      lastPaymentDate: Date | null
      nextPaymentDate: Date | null
    }
    isUnmatched: boolean
  }>
}

export function SubscriptionsList({ subscriptions }: SubscriptionsListProps) {
  // Filter out unmatched subscriptions as they're shown in the other component
  const matchedSubscriptions = subscriptions.filter((sub) => !sub.isUnmatched)

  if (matchedSubscriptions.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Customer Email</TableHead>
            <TableHead>Customer Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Payment</TableHead>
            <TableHead>Next Payment</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matchedSubscriptions.map((sub) => (
            <TableRow key={sub.stripeSubscription.subscriptionId}>
              <TableCell>{sub.student?.name || 'N/A'}</TableCell>
              <TableCell>{sub.stripeSubscription.customerEmail}</TableCell>
              <TableCell>{sub.stripeSubscription.customerName}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    sub.stripeSubscription.status === 'active'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {sub.stripeSubscription.status}
                </Badge>
              </TableCell>
              <TableCell>
                {sub.stripeSubscription.lastPaymentDate
                  ? new Date(
                      sub.stripeSubscription.lastPaymentDate
                    ).toLocaleDateString()
                  : 'Never'}
              </TableCell>
              <TableCell>
                {sub.stripeSubscription.nextPaymentDate
                  ? new Date(
                      sub.stripeSubscription.nextPaymentDate
                    ).toLocaleDateString()
                  : 'N/A'}
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`https://dashboard.stripe.com/subscriptions/${sub.stripeSubscription.subscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View in Stripe
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
