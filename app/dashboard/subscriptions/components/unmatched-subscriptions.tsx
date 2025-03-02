'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ReconciliationResult } from '@/lib/queries/stripe-reconciliation'

interface Student {
  id: string
  name: string
  email: string | null
}

interface UnmatchedSubscriptionsProps {
  subscriptions: ReconciliationResult[]
  students: Student[]
}

export function UnmatchedSubscriptions({
  subscriptions,
  students,
}: UnmatchedSubscriptionsProps) {
  const router = useRouter()
  const [selectedStudents, setSelectedStudents] = useState<
    Record<string, string>
  >({})

  const unmatchedSubscriptions = subscriptions.filter((sub) => sub.isUnmatched)

  if (unmatchedSubscriptions.length === 0) {
    return null
  }

  const handleReconcile = async (subscriptionId: string) => {
    const studentId = selectedStudents[subscriptionId]
    if (!studentId) {
      toast.error('Please select a student first')
      return
    }

    try {
      const response = await fetch('/api/subscriptions/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          subscriptionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reconcile subscription')
      }

      toast.success('Subscription reconciled successfully')
      router.refresh()
    } catch (error) {
      console.error('Error reconciling subscription:', error)
      toast.error('Failed to reconcile subscription')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Unmatched Subscriptions</h2>
      <div className="grid gap-4">
        {unmatchedSubscriptions.map((sub) => {
          const subscription = sub.stripeSubscription
          const customerEmail =
            'customerEmail' in subscription ? subscription.customerEmail : ''
          const customerName =
            'customerName' in subscription ? subscription.customerName : ''

          return (
            <Card key={subscription.subscriptionId}>
              <CardHeader>
                <CardTitle>{customerName}</CardTitle>
                <CardDescription>{customerEmail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Subscription ID: {subscription.subscriptionId}
                  </p>
                  {subscription.metadata.studentName && (
                    <p className="text-sm text-muted-foreground">
                      Student Name: {subscription.metadata.studentName}
                    </p>
                  )}
                  {subscription.metadata.whatsappNumber && (
                    <p className="text-sm text-muted-foreground">
                      WhatsApp: {subscription.metadata.whatsappNumber}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedStudents[subscription.subscriptionId]}
                    onValueChange={(value) =>
                      setSelectedStudents((prev) => ({
                        ...prev,
                        [subscription.subscriptionId]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleReconcile(subscription.subscriptionId)}
                  >
                    Link to Student
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
