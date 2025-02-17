'use client'

import { useState, useMemo } from 'react'

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { BatchStudentData } from '@/lib/actions/get-batch-data'

import { columns } from './columns'
import { useBatchData } from '../hooks/use-batch-data'
import { useBatches } from '../hooks/use-batches'

interface FilterPreset {
  id: string
  name: string
  filters: {
    batch: string
    status: string
    sibling: 'all' | 'with' | 'without'
    search: string
  }
}

const COMMON_FILTERS: FilterPreset[] = [
  {
    id: 'unassigned-new',
    name: '🆕 New Unassigned Students',
    filters: {
      batch: 'none',
      status: 'registered',
      sibling: 'all',
      search: '',
    },
  },
  {
    id: 'unassigned-enrolled',
    name: '📝 Enrolled Without Batch',
    filters: {
      batch: 'none',
      status: 'enrolled',
      sibling: 'all',
      search: '',
    },
  },
  {
    id: 'siblings-unassigned',
    name: '👥 Siblings Needing Batch',
    filters: {
      batch: 'none',
      status: 'all',
      sibling: 'with',
      search: '',
    },
  },
  {
    id: 'on-leave',
    name: '🌴 Students On Leave',
    filters: {
      batch: 'all',
      status: 'on_leave',
      sibling: 'all',
      search: '',
    },
  },
  {
    id: 'withdrawn-with-batch',
    name: '⚠️ Withdrawn (In Batch)',
    filters: {
      batch: 'all',
      status: 'withdrawn',
      sibling: 'all',
      search: '',
    },
  },
  {
    id: 'active-no-siblings',
    name: '👤 Active Solo Students',
    filters: {
      batch: 'all',
      status: 'enrolled',
      sibling: 'without',
      search: '',
    },
  },
]

export function BatchesTable() {
  const { data: students = [], isLoading, error } = useBatchData()
  const { data: batches = [] } = useBatches()
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [siblingFilter, setSiblingFilter] = useState<
    'all' | 'with' | 'without'
  >('all')
  const [batchFilter, setBatchFilter] = useState<string>('all')

  const filteredData = useMemo(() => {
    let result = students

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((student) => student.status === statusFilter)
    }

    // Apply sibling filter
    if (siblingFilter !== 'all') {
      result = result.filter((student) =>
        siblingFilter === 'with' ? student.siblingGroup : !student.siblingGroup
      )
    }

    // Apply batch filter
    if (batchFilter !== 'all') {
      if (batchFilter === 'none') {
        // Show students with no batch assigned
        result = result.filter((student) => !student.batch)
      } else {
        // Show students in the selected batch
        result = result.filter((student) => student.batch?.id === batchFilter)
      }
    }

    // Apply global search filter
    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase()
      result = result.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm) ||
          student.email?.toLowerCase().includes(searchTerm) ||
          student.phone?.toLowerCase().includes(searchTerm) ||
          student.batch?.name.toLowerCase().includes(searchTerm)
      )
    }

    return result
  }, [students, statusFilter, siblingFilter, batchFilter, globalFilter])

  const unassignedCount = useMemo(
    () => students.filter((s) => !s.batch).length,
    [students]
  )

  // Check if any filters are active
  const hasActiveFilters = useMemo(
    () =>
      batchFilter !== 'all' ||
      statusFilter !== 'all' ||
      siblingFilter !== 'all' ||
      globalFilter !== '',
    [batchFilter, statusFilter, siblingFilter, globalFilter]
  )

  // Apply preset filter
  const applyPreset = (preset: FilterPreset) => {
    setBatchFilter(preset.filters.batch)
    setStatusFilter(preset.filters.status)
    setSiblingFilter(preset.filters.sibling)
    setGlobalFilter(preset.filters.search)
  }

  // Clear all filters
  const clearFilters = () => {
    setBatchFilter('all')
    setStatusFilter('all')
    setSiblingFilter('all')
    setGlobalFilter('')
  }

  const table = useReactTable<BatchStudentData>({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  const rows = table.getCoreRowModel().rows

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-muted-foreground">Loading students...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Failed to load students'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TableSummary data={students} />
      <div className="flex flex-col gap-4">
        {/* Filter Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter students..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-[300px]"
            />
            <Select
              value=""
              onValueChange={(value) => {
                const preset = COMMON_FILTERS.find((f) => f.id === value)
                if (preset) applyPreset(preset)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Quick Filters" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_FILTERS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {filteredData.length} of {students.length} students
              </span>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Main Filters Row */}
        <div className="flex items-center gap-4">
          <div className="w-[200px]">
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Batches">
                  {batchFilter === 'all'
                    ? 'All Batches'
                    : batchFilter === 'none'
                      ? `Unassigned (${unassignedCount})`
                      : (batches.find((b) => b.id === batchFilter)?.name ??
                        'Unassigned')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem
                  value="none"
                  className="font-medium text-orange-600"
                >
                  Unassigned ({unassignedCount})
                </SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name} ({batch.studentCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue defaultValue="all">
                  {statusFilter === 'all' ? 'All Statuses' : statusFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select
              value={siblingFilter}
              onValueChange={(value: 'all' | 'with' | 'without') =>
                setSiblingFilter(value)
              }
            >
              <SelectTrigger>
                <SelectValue defaultValue="all">
                  {siblingFilter === 'all'
                    ? 'All Students'
                    : `With ${siblingFilter === 'with' ? '' : 'out'} Siblings`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="with">With Siblings</SelectItem>
                <SelectItem value="without">Without Siblings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function TableSummary({ data }: { data: BatchStudentData[] }) {
  const stats = useMemo(
    () => ({
      total: data.length,
      byStatus: data.reduce(
        (acc, student) => {
          acc[student.status] = (acc[student.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
      withBatch: data.filter((s) => s.batch).length,
      unassigned: data.filter((s) => !s.batch).length,
      siblingGroups: {
        studentsWithSiblings: data.filter((s) => s.siblingGroup).length,
        totalGroups: new Set(
          data.filter((s) => s.siblingGroup).map((s) => s.siblingGroup!.id)
        ).size,
      },
    }),
    [data]
  )

  return (
    <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium text-muted-foreground">
          Total Students
        </div>
        <div className="text-2xl font-bold">{stats.total}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium text-muted-foreground">
          In Batches
        </div>
        <div className="text-2xl font-bold">{stats.withBatch}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium text-muted-foreground">
          Siblings
        </div>
        <div className="mt-1 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Students:</span>
            <span className="font-medium">
              {stats.siblingGroups.studentsWithSiblings}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Groups:</span>
            <span className="font-medium">
              {stats.siblingGroups.totalGroups}
            </span>
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium text-muted-foreground">
          By Status
        </div>
        <div className="mt-1 space-y-1 text-sm">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between">
              <span className="capitalize">{status}:</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-sm font-medium text-muted-foreground">
          Batch Status
        </div>
        <div className="mt-1 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>In Batches:</span>
            <span className="font-medium">{stats.withBatch}</span>
          </div>
          <div className="flex justify-between">
            <span>Unassigned:</span>
            <span className="font-medium text-orange-600">
              {stats.unassigned}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
