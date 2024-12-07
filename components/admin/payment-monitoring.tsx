'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
    refetchInterval: 30000,
  })

  const handleRetryPayment = async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/admin/retry-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })
      if (!response.ok) throw new Error('Failed to retry payment')
      refetch()
    } catch (error) {
      console.error('Error retrying payment:', error)
    }
  }

  const hasFailedPayments = notifications?.some(
    (n: { type: string }) => n.type === 'payment_failed'
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={hasFailedPayments ? 'destructive' : 'outline'}
          size="sm"
          className="flex items-center gap-2"
        >
          {hasFailedPayments && <AlertCircle className="h-4 w-4" />}
          Monitor Payments
          {hasFailedPayments && (
            <span className="text-xs">• Action Required</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Payment Monitoring</DialogTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {hasFailedPayments && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>There are failed payments that require attention</span>
          </div>
        )}

        <div className="max-h-[60vh] overflow-auto">
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
                  <TableCell>{n.type}</TableCell>
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
      </DialogContent>
    </Dialog>
  )
}
