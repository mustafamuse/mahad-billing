'use client'

import { Card } from '@/components/ui/card'

import { useBatches } from '../hooks/use-batches'

export function BatchSummary() {
  const { data: batches = [], isLoading } = useBatches()

  console.log('🏫 Batch Summary:', {
    isLoading,
    hasBatches: batches?.length > 0,
    batches: batches.map((b) => ({
      id: b.id,
      name: b.name,
      studentCount: b.studentCount,
    })),
  })

  if (isLoading) {
    return <div className="text-muted-foreground">Loading batches...</div>
  }

  if (!batches.length) {
    return <div className="text-muted-foreground">No batches found</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Current Batches</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {batches.map((batch) => (
          <Card key={batch.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{batch.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {batch.studentCount} student
                  {batch.studentCount !== 1 ? 's' : ''}
                </p>
              </div>
              {batch.startDate && (
                <div className="text-xs text-muted-foreground">
                  Starts: {new Date(batch.startDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
