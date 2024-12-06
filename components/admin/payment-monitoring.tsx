'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

import { toasts } from '@/components/toast/toast-utils'
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
import { PaymentNotification } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'

export function PaymentMonitoring() {
  const { data: notifications, refetch } = useQuery({
    queryKey: ['payment-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/admin/notifications')
      return res.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleRetryPayment = async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/admin/retry-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to retry payment')
      }

      // Refresh the notifications list
      refetch()

      // Use your existing toast utility
      toasts.success('Payment Retry', 'Payment retry has been initiated')
    } catch (error) {
      console.error('Error retrying payment:', error)
      toasts.apiError({
        title: 'Retry Failed',
        error,
      })
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Payment Monitoring</h2>
        <Button variant="outline" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {notifications?.some(
        (n: { type: string }) => n.type === 'payment_failed'
      ) && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>There are failed payments that require attention</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Next Attempt</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications?.map((n: PaymentNotification) => (
            <TableRow key={`${n.subscriptionId}-${n.timestamp}`}>
              <TableCell>{formatDate(n.timestamp)}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    n.type === 'payment_failed' ? 'destructive' : 'default'
                  }
                >
                  {n.type.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>{n.customerName}</TableCell>
              <TableCell>{n.studentNames.join(', ')}</TableCell>
              <TableCell>{formatCurrency(n.amount)}</TableCell>
              <TableCell>{n.attemptCount || 'N/A'}</TableCell>
              <TableCell>
                {n.nextAttempt ? formatDate(n.nextAttempt * 1000) : 'N/A'}
              </TableCell>
              <TableCell>
                {n.type === 'payment_failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetryPayment(n.subscriptionId)}
                  >
                    Retry Payment
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
