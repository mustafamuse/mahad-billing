'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

// import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface StudentPayment {
  studentId: string
  studentName: string
  subscriptionId: string
  subscriptionStatus: string
  payerName: string
  monthlyRate: number
  lastPayment: number
  nextPayment: number
  paymentStatus: string
  lastPaymentError?: string
}

export function PaymentStatusTracker() {
  const { data: payments } = useQuery({
    queryKey: ['payment-status'],
    queryFn: async () => {
      const res = await fetch('/api/admin/payment-status')
      return res.json() as Promise<StudentPayment[]>
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  function _getStatusIcon(status: StudentPayment['paymentStatus']) {
    switch (status) {
      case 'processing':
        return (
          <Clock
            className="h-5 w-5 text-yellow-500"
            title="Processing (5-7 business days)"
          />
        )
      case 'succeeded':
        return (
          <CheckCircle2
            className="h-5 w-5 text-green-500"
            title="Payment received"
          />
        )
      case 'failed':
        return (
          <AlertCircle
            className="h-5 w-5 text-destructive"
            title="Payment failed"
          />
        )
      case 'requires_action':
        return (
          <AlertCircle
            className="h-5 w-5 text-yellow-500"
            title="Needs verification"
          />
        )
      default:
        return (
          <Clock className="h-5 w-5 text-muted-foreground" title={status} />
        )
    }
  }

  //   function getPaymentStatusBadge(status: string) {
  //     switch (status) {
  //       case 'succeeded':
  //         return <Badge variant="success">Paid</Badge>
  //       case 'processing':
  //         return <Badge variant="warning">Processing</Badge>
  //       case 'requires_payment_method':
  //         return <Badge variant="destructive">Payment Failed</Badge>
  //       default:
  //         return <Badge>{status}</Badge>
  //     }
  //   }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments?.map((payment, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              {getStatusIcon(payment.paymentStatus)}

              <div className="flex-1">
                <p className="font-medium">{payment.studentName}</p>
                <p className="text-sm text-muted-foreground">
                  {payment.payerName}
                </p>
              </div>

              <div className="text-right">
                <p className="font-medium">
                  {formatCurrency(payment.monthlyRate)}
                </p>
                {payment.estimatedArrival && (
                  <p className="text-sm text-muted-foreground">
                    Est. {payment.estimatedArrival}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
