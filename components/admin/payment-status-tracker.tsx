'use client'

// import { useQuery } from '@tanstack/react-query'
// import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

// import { Badge } from '@/components/ui/badge'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { formatCurrency } from '@/lib/utils'

// TODO: Implement payment status tracking
// This feature will track:
// - ACH payment lifecycle (processing -> succeeded/failed)
// - Payment history
// - Next payment dates
// - Payment errors and retries

/*
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
      return res.json()
    },
    refetchInterval: 30000,
  })

  function getStatusBadge(status: string) {
    switch (status) {
      case 'succeeded':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Processing
          </Badge>
        )
      case 'requires_payment_method':
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments?.map((payment: StudentPayment) => (
            <div
              key={payment.subscriptionId}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{payment.studentName}</span>
                  {getStatusBadge(payment.paymentStatus)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {payment.payerName} • {formatCurrency(payment.monthlyRate)}
                </div>
                {payment.lastPaymentError && (
                  <div className="mt-2 text-sm text-red-500">
                    Error: {payment.lastPaymentError}
                  </div>
                )}
              </div>
              <div className="text-right text-sm">
                <div>
                  Last: {new Date(payment.lastPayment).toLocaleDateString()}
                </div>
                <div>
                  Next: {new Date(payment.nextPayment).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
*/

// Temporary placeholder component
export function PaymentStatusTracker() {
  return null
}
