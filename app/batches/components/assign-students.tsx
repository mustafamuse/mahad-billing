'use client'

import { useState, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { assignStudentsToBatch } from '@/lib/actions/batch-actions'
import { cn } from '@/lib/utils'

import { useBatchData } from '../hooks/use-batch-data'
import { useBatches } from '../hooks/use-batches'

interface AssignStudentsDialogProps {
  children?: React.ReactNode
}

export function AssignStudentsDialog({ children }: AssignStudentsDialogProps) {
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <DropdownMenuItem>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Students
          </DropdownMenuItem>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-[900px]"
      >
        <SheetHeader className="px-1">
          <SheetTitle>Assign Students to Batch</SheetTitle>
          <SheetDescription>
            Select students and assign them to a batch
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-6 pb-8">
          {/* Transfer Controls - Moved to top */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[200px]">
              <Select
                value={selectedBatch ?? ''}
                onValueChange={setSelectedBatch}
                name="batch-select"
              >
                <SelectTrigger>
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

            <Button
              onClick={handleAssign}
              disabled={
                !selectedBatch || selectedStudents.size === 0 || isLoading
              }
              className="w-full sm:w-auto"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Assign {
                selectedStudents.size
              } Student
              {selectedStudents.size !== 1 ? 's' : ''}
            </Button>
          </div>

          {/* Two-Column Layout for Lists */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Available Students */}
            <div className="flex h-[300px] flex-col sm:h-[400px]">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-medium">Available Students</h3>
                <Input
                  ref={searchInputRef}
                  placeholder="Search..."
                  className="w-full sm:w-[200px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1 rounded-md border">
                <div className="space-y-2 p-4">
                  {unassignedStudents.map((student) => (
                    <Card
                      key={student.id}
                      className={cn(
                        'cursor-pointer p-3 hover:bg-accent',
                        selectedStudents.has(student.id) && 'border-primary'
                      )}
                      onClick={() => toggleStudent(student.id)}
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

            {/* Batch Students */}
            <div className="flex h-[300px] flex-col sm:h-[400px]">
              <h3 className="mb-4 font-medium">
                Students in{' '}
                {batches.find((b) => b.id === selectedBatch)?.name ?? 'Batch'}
              </h3>
              <ScrollArea className="flex-1 rounded-md border">
                <div className="space-y-2 p-4">
                  {batchStudents.map((student) => (
                    <Card key={student.id} className="p-3">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.status}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
