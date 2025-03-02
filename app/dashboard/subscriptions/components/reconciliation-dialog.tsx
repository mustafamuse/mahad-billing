'use client'

import { useState } from 'react'

import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ReconciliationResult } from '@/lib/queries/stripe-reconciliation'

export function ReconciliationDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ReconciliationResult[]>([])
  const [reconciling, setReconciling] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/subscriptions/unlinked')
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      const unlinkedSubscriptions = result.data
      setResults(unlinkedSubscriptions)

      if (unlinkedSubscriptions.length === 0) {
        toast.success('No unlinked subscriptions found', {
          description:
            'All student subscriptions appear to be properly linked.',
        })
      } else {
        toast.info(
          `Found ${unlinkedSubscriptions.length} unlinked subscription${unlinkedSubscriptions.length === 1 ? '' : 's'}`,
          {
            description: 'Review and reconcile the subscriptions below.',
          }
        )
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast.error('Scan failed', {
        description: errorMessage,
      })
      console.error('Scan failed:', err)
    }
    setIsLoading(false)
  }

  const handleReconcile = async (studentId: string) => {
    setReconciling((prev) => [...prev, studentId])
    try {
      const result = results.find((r) => r.student?.id === studentId)
      if (result) {
        const response = await fetch('/api/subscriptions/reconcile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result),
        })

        const apiResult = await response.json()
        if (!apiResult.success) {
          throw new Error(apiResult.error)
        }

        // Remove reconciled item from results
        setResults((prev) => prev.filter((r) => r.student?.id !== studentId))
        toast.success('Subscription reconciled', {
          description: `Successfully linked subscription for ${result.student?.name}`,
        })
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred'
      setError(
        `Failed to reconcile subscription for ${studentId}: ${errorMessage}`
      )
      toast.error('Reconciliation failed', {
        description: errorMessage,
      })
      console.error('Reconciliation failed:', err)
    }
    setReconciling((prev) => prev.filter((id) => id !== studentId))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Find Unlinked Subscriptions
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Subscription Reconciliation</DialogTitle>
          <DialogDescription>
            Scan for students with Stripe subscriptions that aren't properly
            linked in the database.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Button
            onClick={handleScan}
            disabled={isLoading}
            className="mb-4 w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              'Scan for Unlinked Subscriptions'
            )}
          </Button>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results.length > 0 && (
            <ScrollArea className="h-[300px] rounded-md border p-4">
              {results
                .filter(
                  (
                    result
                  ): result is ReconciliationResult & {
                    student: NonNullable<typeof result.student>
                  } =>
                    result.student !== null &&
                    typeof result.student.id === 'string'
                )
                .map((result) => (
                  <div
                    key={result.student.id}
                    className="flex items-center justify-between border-b py-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{result.student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.student.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Stripe Status: {result.stripeSubscription?.status}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleReconcile(result.student.id)}
                      disabled={reconciling.includes(result.student.id)}
                    >
                      {reconciling.includes(result.student.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Reconcile'
                      )}
                    </Button>
                  </div>
                ))}
            </ScrollArea>
          )}

          {results.length === 0 && !isLoading && (
            <p className="py-4 text-center text-muted-foreground">
              No unlinked subscriptions found.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
