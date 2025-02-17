'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createBatch } from '@/lib/actions/batch-actions'

import { AssignStudentsDialog } from './assign-students'
import { useBatches } from '../hooks/use-batches'

export function BatchManagement() {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const {
    data: batches = [],
    isLoading: isLoadingBatches,
    invalidateBatches,
  } = useBatches()

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      await createBatch(name)
      toast.success('Batch created successfully')
      setName('')
      await invalidateBatches()
    } catch (error) {
      console.error('Failed to create batch:', error)
      toast.error('Failed to create batch')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <form onSubmit={handleCreateBatch} className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-muted-foreground"
            >
              Batch Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter batch name..."
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={!name || isLoading}>
            Create Batch
          </Button>
        </form>
        <AssignStudentsDialog />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Batches</h2>
        {isLoadingBatches ? (
          <div className="text-muted-foreground">Loading batches...</div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
