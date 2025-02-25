'use client'

import { useState, useEffect, Suspense } from 'react'

import { useSearchParams } from 'next/navigation'

import { format } from 'date-fns'
import { Toaster } from 'sonner'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { DuplicateHeader } from './duplicate-header'

interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  createdAt: string
  updatedAt: string
  batchId: string | null
  siblingGroupId: string | null
  batch: {
    name: string
  } | null
  payer: {
    name: string
    email: string
    stripeCustomerId: string
  } | null
}

interface ExactDuplicateGroup {
  name: string
  count: number
  students: Student[]
}

interface SimilarGroup {
  similarity: number
  students: Student[]
}

interface DuplicateResponse {
  exact?: {
    groups: ExactDuplicateGroup[]
    totalGroups: number
    totalStudents: number
  }
  similar?: {
    groups: SimilarGroup[]
    totalGroups: number
    totalStudents: number
  }
}

// Create a wrapper component that uses useSearchParams
function DuplicateStudentsContent() {
  const _searchParams = useSearchParams()
  const [data, setData] = useState<DuplicateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState(80)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRecords, setSelectedRecords] = useState<
    Record<string, string>
  >({}) // groupId -> studentId
  const [transferOptions, setTransferOptions] = useState<
    Record<string, string[]>
  >({}) // groupId -> [options]
  const [processingGroups, setProcessingGroups] = useState<
    Record<string, boolean>
  >({}) // groupId -> isProcessing
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [currentGroup, setCurrentGroup] = useState<{
    groupId: string
    groupType: 'exact' | 'similar'
  } | null>(null)

  const fetchDuplicates = async (mode: string, similarityThreshold: number) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/students/duplicates?mode=${mode}&threshold=${similarityThreshold}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch duplicate students')
      }
      const result = await response.json()
      setData(result)

      // Reset selections when data changes
      setSelectedRecords({})
      setTransferOptions({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDuplicates(activeTab, threshold)
  }, [activeTab, threshold])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const handleThresholdChange = (value: number[]) => {
    setThreshold(value[0])
  }

  const isLatestRecord = (student: Student, group: Student[]) => {
    const latestDate = new Date(
      Math.max(...group.map((s) => new Date(s.updatedAt).getTime()))
    )
    return new Date(student.updatedAt).getTime() === latestDate.getTime()
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a')
  }

  const handleRecordSelection = (groupId: string, studentId: string) => {
    setSelectedRecords((prev) => ({
      ...prev,
      [groupId]: studentId,
    }))
  }

  const handleTransferOptionChange = (
    groupId: string,
    option: string,
    checked: boolean
  ) => {
    setTransferOptions((prev) => {
      const currentOptions = prev[groupId] || []
      if (checked) {
        return {
          ...prev,
          [groupId]: [...currentOptions, option],
        }
      } else {
        return {
          ...prev,
          [groupId]: currentOptions.filter((opt) => opt !== option),
        }
      }
    })
  }

  const handleMergeAndDelete = async (
    groupId: string,
    groupType: 'exact' | 'similar'
  ) => {
    setCurrentGroup({ groupId, groupType })
    setConfirmDialogOpen(true)
  }

  const confirmMergeAndDelete = async () => {
    if (!currentGroup) return

    const { groupId, groupType } = currentGroup
    const selectedStudentId = selectedRecords[groupId]

    if (!selectedStudentId) {
      toast.error('Please select a record to keep')
      return
    }

    setProcessingGroups((prev) => ({ ...prev, [groupId]: true }))

    try {
      // Get the group of students
      const group =
        groupType === 'exact'
          ? data?.exact?.groups[parseInt(groupId.split('-')[1])]
          : data?.similar?.groups[parseInt(groupId.split('-')[1])]

      if (!group) throw new Error('Group not found')

      const students = 'students' in group ? group.students : []
      const selectedStudent = students.find((s) => s.id === selectedStudentId)
      const studentsToDelete = students.filter(
        (s) => s.id !== selectedStudentId
      )

      if (!selectedStudent) throw new Error('Selected student not found')

      // Prepare data to transfer (batch, payer, etc.)
      const transferData: Record<string, any> = {}

      // Check which data to transfer
      const options = transferOptions[groupId] || []

      // If batch transfer is selected and the selected student doesn't have a batch
      if (options.includes('batch') && !selectedStudent.batchId) {
        // Find a student with a batch
        const studentWithBatch = students.find(
          (s) => s.batchId && s.id !== selectedStudentId
        )
        if (studentWithBatch) {
          transferData.batchId = studentWithBatch.batchId
        }
      }

      // If payer transfer is selected and the selected student doesn't have a payer
      if (options.includes('payer') && !selectedStudent.payer) {
        // Find a student with a payer
        const studentWithPayer = students.find(
          (s) => s.payer && s.id !== selectedStudentId
        )
        if (studentWithPayer) {
          transferData.payerId = studentWithPayer.payer?.email // Assuming this is how you reference the payer
        }
      }

      // If sibling transfer is selected and the selected student doesn't have a sibling
      if (options.includes('sibling') && !selectedStudent.siblingGroupId) {
        // Find a student with a sibling
        const studentWithSibling = students.find(
          (s) => s.siblingGroupId && s.id !== selectedStudentId
        )
        if (studentWithSibling) {
          transferData.siblingGroupId = studentWithSibling.siblingGroupId
        }
      }

      // Update the selected student with transferred data if needed
      if (Object.keys(transferData).length > 0) {
        const updateResponse = await fetch(
          `/api/admin/students/${selectedStudentId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(transferData),
          }
        )

        if (!updateResponse.ok) {
          throw new Error('Failed to update the selected student')
        }
      }

      // Delete the other students
      for (const student of studentsToDelete) {
        const deleteResponse = await fetch(
          `/api/admin/students/${student.id}`,
          {
            method: 'DELETE',
          }
        )

        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete student ${student.name}`)
        }
      }

      // Refresh the data
      await fetchDuplicates(activeTab, threshold)

      toast.success(
        `Kept ${selectedStudent.name} and deleted ${studentsToDelete.length} duplicate records`
      )
    } catch (err) {
      console.error(err)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to merge and delete records'
      )
    } finally {
      setProcessingGroups((prev) => ({ ...prev, [groupId]: false }))
      setConfirmDialogOpen(false)
    }
  }

  const renderExactDuplicateGroup = (
    group: ExactDuplicateGroup,
    groupIndex: number,
    _standalone = false
  ) => {
    const groupId = `exact-${groupIndex}`
    const isProcessing = processingGroups[groupId] || false
    const selectedId = selectedRecords[groupId]

    // Check if any student has a batch, payer, or sibling
    const hasBatch = group.students.some((s) => s.batchId)
    const hasPayer = group.students.some((s) => s.payer)
    const hasSibling = group.students.some((s) => s.siblingGroupId)

    return (
      <div key={groupId} className="mb-8 overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between bg-muted p-4">
          <div>
            <h3 className="text-lg font-semibold">{group.name}</h3>
            <p className="text-sm text-muted-foreground">
              {group.count} records with the same name
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedId || isProcessing}
              onClick={() => handleMergeAndDelete(groupId, 'exact')}
            >
              {isProcessing ? 'Processing...' : 'Merge & Delete'}
            </Button>
          </div>
        </div>

        <div className="border-b bg-muted/30 p-4">
          <div className="mb-2 text-sm font-medium">Select record to keep:</div>
          <RadioGroup
            value={selectedId}
            onValueChange={(value) => handleRecordSelection(groupId, value)}
            className="mb-4"
          >
            {group.students.map((student) => (
              <div key={student.id} className="flex items-center space-x-2">
                <RadioGroupItem value={student.id} id={student.id} />
                <Label htmlFor={student.id} className="flex items-center gap-2">
                  {student.email || 'No email'}
                  {isLatestRecord(student, group.students) && (
                    <Badge
                      variant="outline"
                      className="bg-green-700 text-white"
                    >
                      Latest
                    </Badge>
                  )}
                  {student.batch && (
                    <Badge variant="outline" className="bg-blue-700 text-white">
                      {student.batch.name}
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedId && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Transfer options:</div>
              {hasBatch &&
                !group.students.find((s) => s.id === selectedId)?.batchId && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${groupId}-batch`}
                      checked={(transferOptions[groupId] || []).includes(
                        'batch'
                      )}
                      onCheckedChange={(checked) =>
                        handleTransferOptionChange(
                          groupId,
                          'batch',
                          checked === true
                        )
                      }
                    />
                    <Label htmlFor={`${groupId}-batch`}>
                      Transfer batch assignment to kept record
                    </Label>
                  </div>
                )}

              {hasPayer &&
                !group.students.find((s) => s.id === selectedId)?.payer && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${groupId}-payer`}
                      checked={(transferOptions[groupId] || []).includes(
                        'payer'
                      )}
                      onCheckedChange={(checked) =>
                        handleTransferOptionChange(
                          groupId,
                          'payer',
                          checked === true
                        )
                      }
                    />
                    <Label htmlFor={`${groupId}-payer`}>
                      Transfer payer information to kept record
                    </Label>
                  </div>
                )}

              {hasSibling &&
                !group.students.find((s) => s.id === selectedId)
                  ?.siblingGroupId && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${groupId}-sibling`}
                      checked={(transferOptions[groupId] || []).includes(
                        'sibling'
                      )}
                      onCheckedChange={(checked) =>
                        handleTransferOptionChange(
                          groupId,
                          'sibling',
                          checked === true
                        )
                      }
                    />
                    <Label htmlFor={`${groupId}-sibling`}>
                      Transfer sibling relationship to kept record
                    </Label>
                  </div>
                )}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Sibling</TableHead>
              <TableHead>Stripe ID</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.students.map((student) => (
              <TableRow
                key={student.id}
                className={selectedId === student.id ? 'bg-primary/5' : ''}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {student.status}
                    {isLatestRecord(student, group.students) && (
                      <Badge
                        variant="outline"
                        className="bg-green-700 text-white"
                      >
                        Latest
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{student.email || '-'}</TableCell>
                <TableCell>{student.phone || '-'}</TableCell>
                <TableCell>
                  {student.batch ? (
                    <Badge variant="outline" className="bg-blue-700 text-white">
                      {student.batch.name}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {student.payer ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-700 text-white"
                    >
                      {student.payer.name}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {student.siblingGroupId ? (
                    <Badge
                      variant="outline"
                      className="bg-purple-700 text-white"
                    >
                      Has Siblings
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {student.payer?.stripeCustomerId ? (
                    <span className="font-mono text-xs">
                      {student.payer.stripeCustomerId.substring(0, 10)}...
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{formatDate(student.createdAt)}</TableCell>
                <TableCell>{formatDate(student.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderSimilarGroup = (
    group: SimilarGroup,
    groupIndex: number,
    _standalone = false
  ) => {
    const groupId = `similar-${groupIndex}`
    const isProcessing = processingGroups[groupId] || false
    const selectedId = selectedRecords[groupId]

    // Check if any student has a batch, payer, or sibling
    const hasBatch = group.students.some((s) => s.batchId)
    const hasPayer = group.students.some((s) => s.payer)
    const hasSibling = group.students.some((s) => s.siblingGroupId)

    return (
      <div key={groupId} className="mb-8 overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between bg-muted p-4">
          <div>
            <h3 className="text-lg font-semibold">
              Similarity: {group.similarity}%
            </h3>
            <p className="text-sm text-muted-foreground">
              {group.students.length} records with similar names
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedId || isProcessing}
              onClick={() => handleMergeAndDelete(groupId, 'similar')}
            >
              {isProcessing ? 'Processing...' : 'Merge & Delete'}
            </Button>
          </div>
        </div>

        <div className="border-b bg-muted/30 p-4">
          <div className="mb-2 text-sm font-medium">Select record to keep:</div>
          <RadioGroup
            value={selectedId}
            onValueChange={(value) => handleRecordSelection(groupId, value)}
            className="mb-4"
          >
            {group.students.map((student) => (
              <div key={student.id} className="flex items-center space-x-2">
                <RadioGroupItem value={student.id} id={student.id} />
                <Label htmlFor={student.id} className="flex items-center gap-2">
                  {student.name}
                  {isLatestRecord(student, group.students) && (
                    <Badge
                      variant="outline"
                      className="bg-green-700 text-white"
                    >
                      Latest
                    </Badge>
                  )}
                  {student.batch && (
                    <Badge variant="outline" className="bg-blue-700 text-white">
                      {student.batch.name}
                    </Badge>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedId && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Transfer options:</div>
              {hasBatch &&
                !group.students.find((s) => s.id === selectedId)?.batchId && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${groupId}-batch`}
                      checked={(transferOptions[groupId] || []).includes(
                        'batch'
                      )}
                      onCheckedChange={(checked) =>
                        handleTransferOptionChange(
                          groupId,
                          'batch',
                          checked === true
                        )
                      }
                    />
                    <Label htmlFor={`${groupId}-batch`}>
                      Transfer batch assignment to kept record
                    </Label>
                  </div>
                )}

              {hasPayer &&
                !group.students.find((s) => s.id === selectedId)?.payer && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${groupId}-payer`}
                      checked={(transferOptions[groupId] || []).includes(
                        'payer'
                      )}
                      onCheckedChange={(checked) =>
                        handleTransferOptionChange(
                          groupId,
                          'payer',
                          checked === true
                        )
                      }
                    />
                    <Label htmlFor={`${groupId}-payer`}>
                      Transfer payer information to kept record
                    </Label>
                  </div>
                )}

              {hasSibling &&
                !group.students.find((s) => s.id === selectedId)
                  ?.siblingGroupId && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${groupId}-sibling`}
                      checked={(transferOptions[groupId] || []).includes(
                        'sibling'
                      )}
                      onCheckedChange={(checked) =>
                        handleTransferOptionChange(
                          groupId,
                          'sibling',
                          checked === true
                        )
                      }
                    />
                    <Label htmlFor={`${groupId}-sibling`}>
                      Transfer sibling relationship to kept record
                    </Label>
                  </div>
                )}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Sibling</TableHead>
              <TableHead>Stripe ID</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.students.map((student) => (
              <TableRow
                key={student.id}
                className={selectedId === student.id ? 'bg-primary/5' : ''}
              >
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {student.status}
                    {isLatestRecord(student, group.students) && (
                      <Badge
                        variant="outline"
                        className="bg-green-700 text-white"
                      >
                        Latest
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{student.email || '-'}</TableCell>
                <TableCell>{student.phone || '-'}</TableCell>
                <TableCell>
                  {student.batch ? (
                    <Badge variant="outline" className="bg-blue-700 text-white">
                      {student.batch.name}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {student.payer ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-700 text-white"
                    >
                      {student.payer.name}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {student.siblingGroupId ? (
                    <Badge
                      variant="outline"
                      className="bg-purple-700 text-white"
                    >
                      Has Siblings
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {student.payer?.stripeCustomerId ? (
                    <span className="font-mono text-xs">
                      {student.payer.stripeCustomerId.substring(0, 10)}...
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{formatDate(student.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="container mx-auto py-10">
        <DuplicateHeader />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="container mx-auto py-10">
        <DuplicateHeader />
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <p>Error: {error}</p>
          <Button
            onClick={() => fetchDuplicates(activeTab, threshold)}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <DuplicateHeader />
      <Toaster />

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Merge and Delete</AlertDialogTitle>
            <AlertDialogDescription>
              This will keep the selected record, transfer any selected data,
              and permanently delete the other records. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMergeAndDelete}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Adjust settings to find duplicate students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Similarity Threshold: {threshold}%
                </label>
                <Slider
                  value={[threshold]}
                  min={50}
                  max={95}
                  step={5}
                  onValueChange={handleThresholdChange}
                  className="w-full"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Higher values will only match very similar names
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Duplicates</TabsTrigger>
          <TabsTrigger value="exact">Exact Matches</TabsTrigger>
          <TabsTrigger value="similar">Similar Names</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-8">
          {data?.exact && (
            <Card>
              <CardHeader>
                <CardTitle>Exact Duplicates</CardTitle>
                <CardDescription>
                  Found {data.exact.totalGroups} groups with{' '}
                  {data.exact.totalStudents} students having identical names
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.exact.groups.map((group, groupIndex) =>
                  renderExactDuplicateGroup(group, groupIndex)
                )}
              </CardContent>
            </Card>
          )}

          {data?.similar && (
            <Card>
              <CardHeader>
                <CardTitle>Similar Names</CardTitle>
                <CardDescription>
                  Found {data.similar.totalGroups} groups with{' '}
                  {data.similar.totalStudents} students having similar names
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.similar.groups.map((group, groupIndex) =>
                  renderSimilarGroup(group, groupIndex)
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exact">
          {data?.exact && (
            <Card>
              <CardHeader>
                <CardTitle>Exact Duplicates</CardTitle>
                <CardDescription>
                  Found {data.exact.totalGroups} groups with{' '}
                  {data.exact.totalStudents} students having identical names
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.exact.groups.map((group, groupIndex) =>
                  renderExactDuplicateGroup(group, groupIndex, true)
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="similar">
          {data?.similar && (
            <Card>
              <CardHeader>
                <CardTitle>Similar Names</CardTitle>
                <CardDescription>
                  Found {data.similar.totalGroups} groups with{' '}
                  {data.similar.totalStudents} students having similar names
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.similar.groups.map((group, groupIndex) =>
                  renderSimilarGroup(group, groupIndex, true)
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Main page component with Suspense boundary
export default function DuplicateStudentsPage() {
  return (
    <Suspense
      fallback={<div className="container mx-auto py-6">Loading...</div>}
    >
      <DuplicateStudentsContent />
    </Suspense>
  )
}
