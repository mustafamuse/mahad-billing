'use client'

import { useEffect, useState } from 'react'

import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
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
  getDuplicateStudents,
  deleteDuplicateRecords,
} from '@/lib/actions/get-batch-data'

interface DuplicateStudent {
  id: string
  name: string
  email: string
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

  if (isLoading) return <div>Checking for duplicates...</div>
  if (error) return <div>Error: {error}</div>
  if (!duplicates.length) {
    console.log('ℹ️ No duplicates found')
    return null
  }

  return (
    <Card className="bg-amber-50 dark:bg-amber-950">
      <CardHeader>
        <CardTitle className="text-amber-900 dark:text-amber-100">
          Duplicate Student Records Found
        </CardTitle>
        <CardDescription>
          {duplicates.length} student(s) have multiple records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {duplicates.map((group) => (
            <div
              key={group.email}
              className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-amber-900 dark:text-amber-100">
                  {group.email} ({group.count} records)
                  {group.hasSiblingGroup && (
                    <span className="ml-2 text-sm text-blue-500">
                      Has sibling group
                    </span>
                  )}
                </h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(group)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete {
                    group.duplicateRecords.length
                  } duplicates
                </Button>
              </div>

              {/* Record to keep */}
              <div className="mt-4 rounded-md bg-green-50 p-2 dark:bg-green-900/20">
                <p className="font-medium text-green-700 dark:text-green-300">
                  Record to keep:
                </p>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span>{group.keepRecord.name}</span>
                  <span className="text-muted-foreground">
                    Created:{' '}
                    {format(
                      new Date(group.keepRecord.createdAt),
                      'MMM d, yyyy'
                    )}
                  </span>
                </div>
              </div>

              {/* Duplicate records */}
              <div className="mt-2">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Records to delete:
                </p>
                <div className="mt-1 space-y-1">
                  {group.duplicateRecords.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{student.name}</span>
                      <span className="text-muted-foreground">
                        Created:{' '}
                        {format(new Date(student.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {group.differences && (
                <div className="mt-2 rounded-md bg-red-50 p-2 text-sm dark:bg-red-900/20">
                  <p className="font-medium text-red-700 dark:text-red-300">
                    Fields with different values:
                  </p>
                  <ul className="mt-1 list-inside list-disc">
                    {Object.entries(group.differences).map(
                      ([field, values]) => (
                        <li
                          key={field}
                          className="text-red-600 dark:text-red-400"
                        >
                          {field}: {Array.from(values).join(' | ')}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
