/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useEffect, useState } from 'react'

import { format, parseISO } from 'date-fns'
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
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
  updatedAt: string
  siblingGroup: {
    id: string
  } | null
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
  hasRecentActivity: boolean
  differences: {
    [field: string]: Set<string>
  } | null
  lastUpdated: string
}

function formatDate(dateString: string | Date) {
  if (!dateString) return 'N/A'
  try {
    const date =
      typeof dateString === 'string' ? parseISO(dateString) : dateString
    return format(date, 'MMM d, yyyy')
  } catch (e) {
    console.error('Date formatting error:', e)
    return 'Invalid date'
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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDuplicates() {
      try {
        const data = await getDuplicateStudents()
        // Ensure all dates are strings
        const formattedData = data.map((group) => ({
          ...group,
          keepRecord: {
            ...group.keepRecord,
            createdAt: group.keepRecord.createdAt.toString(),
            updatedAt: group.keepRecord.updatedAt.toString(),
          },
          duplicateRecords: group.duplicateRecords.map((record) => ({
            ...record,
            createdAt: record.createdAt.toString(),
            updatedAt: record.updatedAt.toString(),
          })),
        }))
        setDuplicates(formattedData)
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
      // Get IDs of records to delete
      const recordsToDelete = group.duplicateRecords.map((r) => r.id)
      // Set loading state
      // setDeletingIds((prev) => new Set([...prev, group.email]))
      setDeletingIds((prev) => new Set(Array.from(prev).concat(group.email)))

      // Call the server action to delete
      await deleteDuplicateRecords(recordsToDelete)

      // Refresh the data
      const newData = await getDuplicateStudents()
      setDuplicates(newData)

      toast.success(`Deleted ${recordsToDelete.length} duplicate records`)
    } catch (error) {
      console.error('❌ Error deleting duplicates:', error)
      toast.error('Failed to delete duplicate records')
    } finally {
      // Clear loading state
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(group.email)
        return next
      })
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {duplicates.length} student(s) have multiple records
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            /* handle bulk delete */
          }}
          disabled={duplicates.some(
            (g) => g.hasSiblingGroup || g.hasRecentActivity
          )}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {duplicates.length} duplicates
        </Button>
      </div>

      {duplicates.map((group) => (
        <div key={group.email} className="rounded-lg border bg-background p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">
                  {group.email} ({group.count} records)
                </h3>
                <div className="mt-1 flex gap-2">
                  {group.hasSiblingGroup && (
                    <Badge variant="secondary" className="text-blue-600">
                      Has sibling group
                    </Badge>
                  )}
                  {group.hasRecentActivity && (
                    <Badge variant="secondary" className="text-green-600">
                      Recent activity
                    </Badge>
                  )}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingIds.has(group.email)}
                  >
                    {deletingIds.has(group.email) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete {
                          group.duplicateRecords.length
                        } Duplicate
                        {group.duplicateRecords.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Delete Duplicate Records
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        This will delete {group.duplicateRecords.length}{' '}
                        duplicate record
                        {group.duplicateRecords.length > 1 ? 's' : ''} for{' '}
                        {group.email}.
                      </p>

                      <div className="rounded-md border bg-green-50/50 p-3">
                        <p className="font-medium text-green-900">
                          Record to keep:
                        </p>
                        <div className="mt-2">
                          <p className="font-medium">{group.keepRecord.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Created: {formatDate(group.keepRecord.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-md border bg-destructive/10 p-3">
                        <p className="font-medium text-destructive">
                          Records to delete:
                        </p>
                        <div className="mt-2 space-y-2">
                          {group.duplicateRecords.map((record) => (
                            <div key={record.id} className="text-sm">
                              {record.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(group)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deletingIds.has(group.email)}
                    >
                      {deletingIds.has(group.email) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Duplicates'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Record to Keep */}
            <div className="rounded-md border bg-green-50/50 p-3">
              <h4 className="text-sm font-medium text-green-900">
                Record to keep:
              </h4>
              <div className="mt-2">
                <p className="font-medium">{group.keepRecord.name}</p>
                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <p>Created: {formatDate(group.keepRecord.createdAt)}</p>
                  <p>Last updated: {formatDate(group.lastUpdated)}</p>
                  {group.hasSiblingGroup && (
                    <p className="text-blue-600">Connected to sibling group</p>
                  )}
                  {group.hasRecentActivity && (
                    <Badge variant="secondary" className="text-green-600">
                      Recent activity
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Records to Delete */}
            <div className="rounded-md border bg-red-50/50 p-3">
              <h4 className="text-sm font-medium text-red-900">
                Records to delete:
              </h4>
              <div className="mt-2 space-y-2">
                {group.duplicateRecords.map((record) => (
                  <div key={record.id}>
                    <p className="font-medium">{record.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created: {formatDate(record.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Differences */}
            {group.differences && (
              <div className="rounded-md border bg-muted/50 p-3">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  Fields with different values:
                </h4>
                <ul className="mt-3 space-y-3">
                  {Object.entries(group.differences).map(([field, values]) => (
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
                            {value}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
