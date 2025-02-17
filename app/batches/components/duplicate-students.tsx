/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useEffect, useState } from 'react'

import { format, parseISO } from 'date-fns'
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  getDuplicateStudents,
  deleteDuplicateRecords,
} from '@/lib/actions/get-batch-data'

interface DuplicateStudent {
  id: string
  name: string
  email: string | null
  status: string
  createdAt: string
}

interface FieldDifferences {
  [field: string]: Set<any>
}

interface DuplicateGroup {
  email: string
  count: number
  keepRecord: DuplicateStudent
  duplicateRecords: DuplicateStudent[]
  hasSiblingGroup: boolean
  differences: FieldDifferences | null
}

function formatDate(dateString: string) {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch (e) {
    return dateString
  }
}

function formatDateOfBirth(dateString: string) {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch (e) {
    return dateString.split('T')[0]
  }
}

export function DuplicateStudents() {
  const [isLoading, setIsLoading] = useState(true)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDuplicates() {
      try {
        const data = await getDuplicateStudents()
        setDuplicates(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load duplicates'
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadDuplicates()
  }, [])

  console.log('🎨 DuplicateStudents render:', {
    isLoading,
    hasData: duplicates.length > 0,
    duplicatesCount: duplicates.length,
    error,
  })

  const handleDelete = async (group: DuplicateGroup) => {
    try {
      const recordsToDelete = group.duplicateRecords.map((r) => r.id)
      await deleteDuplicateRecords(recordsToDelete)

      // Refresh the data
      const newData = await getDuplicateStudents()
      setDuplicates(newData)

      toast.success(`Deleted ${recordsToDelete.length} duplicate records`)
    } catch (error) {
      console.error('❌ Error deleting duplicates:', error)
      toast.error('Failed to delete duplicate records')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking for duplicates...
        </div>
      </div>
    )
  }
  if (error) return <div>Error: {error}</div>
  if (!duplicates.length) {
    console.log('ℹ️ No duplicates found')
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {duplicates.length} student(s) have multiple records
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="w-full transition-all duration-200 hover:bg-red-600 sm:w-auto"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {duplicates.length} duplicates
        </Button>
      </div>

      {duplicates.map((group) => (
        <div
          key={group.email}
          className="rounded-lg border bg-background p-3 transition-all duration-200 hover:shadow-md sm:p-4"
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">
                  {group.email} ({group.count} records)
                </h3>
                {group.hasSiblingGroup && (
                  <span className="text-sm text-blue-600">
                    Has sibling group
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border bg-green-50/50 p-3">
                <h4 className="text-sm font-medium text-green-900">
                  Record to keep:
                </h4>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{group.keepRecord.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Created: {formatDate(group.keepRecord.createdAt)}
                  </span>
                </div>
              </div>

              <div className="rounded-md border bg-red-50/50 p-3">
                <h4 className="text-sm font-medium text-red-900">
                  Records to delete:
                </h4>
                <div className="mt-2 space-y-2">
                  {group.duplicateRecords.map((record, index) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium">{record.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Created: {formatDate(record.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {group.differences && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Fields with different values:
                  </h4>
                  <ul className="mt-3 space-y-3">
                    {Object.entries(group.differences).map(
                      ([field, values]) => (
                        <li key={field} className="flex flex-col space-y-1.5">
                          <span className="text-sm font-medium capitalize text-muted-foreground">
                            {field}
                          </span>
                          <div className="flex flex-wrap gap-2 text-sm">
                            {Array.from(values).map((value, i) => (
                              <span
                                key={`${field}-${i}`}
                                className="rounded bg-muted px-2 py-1"
                              >
                                {field.toLowerCase().includes('date')
                                  ? formatDateOfBirth(value)
                                  : value}
                              </span>
                            ))}
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
