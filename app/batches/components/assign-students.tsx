'use client'

import { useState, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { assignStudentsToBatch } from '@/lib/actions/batch-actions'
import { cn } from '@/lib/utils'

import { useBatchData } from '../hooks/use-batch-data'
import { useBatches } from '../hooks/use-batches'

export function AssignStudentsDialog() {
  const [open, setOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(false)

  const queryClient = useQueryClient()
  const { data: batches = [] } = useBatches()
  const { data: students = [] } = useBatchData()

  const unassignedStudents = students
    .filter((s) => !s.batch)
    .filter((s) =>
      search ? s.name.toLowerCase().includes(search.toLowerCase()) : true
    )

  const batchStudents = students
    .filter((s) => s.batch?.id === selectedBatch)
    .filter((s) =>
      search ? s.name.toLowerCase().includes(search.toLowerCase()) : true
    )

  function toggleStudent(studentId: string) {
    setSelectedStudents((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  async function handleAssign() {
    if (!selectedBatch || selectedStudents.size === 0) return

    setIsLoading(true)
    try {
      console.log('🔄 Starting assignment:', {
        batchId: selectedBatch,
        studentCount: selectedStudents.size,
        students: Array.from(selectedStudents),
      })

      const result = await assignStudentsToBatch(
        selectedBatch,
        Array.from(selectedStudents)
      )

      if (result.success) {
        toast.success('Students assigned successfully')
        // Invalidate both queries to ensure data is fresh
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['students'] }),
          queryClient.invalidateQueries({ queryKey: ['batches'] }),
        ])

        // Clear selections but keep dialog open to see the update
        setSelectedStudents(new Set())
      }
    } catch (error) {
      console.error('Assignment error:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to assign students'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle dialog open/close
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      // Reset state when opening
      setSelectedBatch(null)
      setSelectedStudents(new Set())
      setSearch('')
      // Focus will be managed by Radix UI
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Assign Students to Batch</Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-5xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault() // Prevent default focus behavior
        }}
      >
        <DialogHeader>
          <DialogTitle>Assign Students to Batch</DialogTitle>
          <DialogDescription>
            Select students from the left panel to assign them to a batch. Use
            the search to filter students.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-[1fr,auto,1fr] gap-6">
          {/* Available Students */}
          <div>
            <div className="mb-4 flex justify-between">
              <h3 className="font-medium">Available Students</h3>
              <Input
                ref={searchInputRef}
                placeholder="Search..."
                className="w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={(e) => e.stopPropagation()} // Prevent focus event bubbling
              />
            </div>
            <ScrollArea className="h-[500px] rounded-md border">
              <div className="space-y-2 p-4">
                {unassignedStudents.map((student) => (
                  <Card
                    key={student.id}
                    className={cn(
                      'cursor-pointer p-3 hover:bg-accent',
                      selectedStudents.has(student.id) && 'border-primary'
                    )}
                    onClick={() => toggleStudent(student.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleStudent(student.id)
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedStudents.has(student.id)} />
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.status}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Transfer Controls */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-[200px]">
              <label
                htmlFor="batch-select"
                className="mb-2 block text-sm font-medium"
              >
                Select Batch
              </label>
              <Select
                value={selectedBatch ?? ''}
                onValueChange={setSelectedBatch}
                name="batch-select"
              >
                <SelectTrigger id="batch-select" className="w-full">
                  <SelectValue placeholder="Choose a batch" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="max-h-[200px]">
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name} ({batch.studentCount})
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleAssign}
                disabled={
                  !selectedBatch || selectedStudents.size === 0 || isLoading
                }
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Assign {
                  selectedStudents.size
                } Student{selectedStudents.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>

          {/* Batch Students */}
          <div>
            <h3 className="mb-4 font-medium">
              Students in{' '}
              {batches.find((b) => b.id === selectedBatch)?.name ?? 'Batch'}
            </h3>
            <ScrollArea className="h-[500px] rounded-md border">
              <div className="space-y-2 p-4">
                {batchStudents.map((student) => (
                  <Card key={student.id} className="p-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.status}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
