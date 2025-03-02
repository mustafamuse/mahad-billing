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
import { getStudentSubscriptions } from '@/lib/queries/subscriptions'



export async function SubscriptionsTable() {
  const subscriptions = await getStudentSubscriptions()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Monthly Rate</TableHead>
            <TableHead>Subscription Status</TableHead>
            <TableHead>Last Payment</TableHead>
            <TableHead>Next Payment</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((sub) => (
            <TableRow key={sub.student.id}>
              <TableCell className="font-medium">{sub.student.name}</TableCell>
              <TableCell>{sub.student.email || 'N/A'}</TableCell>
              <TableCell>${sub.student.monthlyRate}</TableCell>
              <TableCell>
                <SubscriptionStatusBadge
                  status={sub.subscription?.status || 'NO_SUBSCRIPTION'}
                />
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
                {sub.subscription?.stripeSubscriptionId ? (
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
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/autopay">Set up AutoPay</Link>
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

function SubscriptionStatusBadge({ status }: { status: string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500'
      case 'PAST_DUE':
        return 'bg-yellow-500'
      case 'CANCELED':
        return 'bg-red-500'
      case 'INACTIVE':
        return 'bg-gray-500'
      case 'NO_SUBSCRIPTION':
        return 'bg-gray-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <Badge className={getStatusColor(status)}>{status.replace('_', ' ')}</Badge>
  )
}
