'use client'

import { useState, useMemo } from 'react'

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'
import { Users, GraduationCap, Users2, BarChart3 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
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

// First, let's create a function to generate all filters including batch-specific ones
function getFilters(batches: Array<{ id: string; name: string }>) {
  const staticFilters: FilterPreset[] = [
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

  // Generate batch-specific filters
  const batchFilters: FilterPreset[] = batches.map((batch) => ({
    id: `batch-${batch.id}`,
    name: `📚 ${batch.name}`,
    filters: {
      batch: batch.id,
      status: 'all',
      sibling: 'all',
      search: '',
    },
  }))

  // Group filters by category
  return {
    common: staticFilters,
    batches: batchFilters,
  }
}

export function BatchesTable() {
  const { data: students = [], isLoading, error } = useBatchData()
  const { data: batches = [] } = useBatches()
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [siblingFilter, setSiblingFilter] = useState<
    'all' | 'with' | 'without'
  >('all')
  const [batchFilter, setBatchFilter] = useState<string>('all')

  const allFilters = useMemo(() => getFilters(batches), [batches])

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

  const stats = useMemo(
    () => ({
      total: students.length,
      byStatus: students.reduce(
        (acc, student) => {
          acc[student.status] = (acc[student.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
      withBatch: students.filter((s) => s.batch).length,
      unassigned: students.filter((s) => !s.batch).length,
      siblingGroups: {
        studentsWithSiblings: students.filter((s) => s.siblingGroup).length,
        totalGroups: new Set(
          students.filter((s) => s.siblingGroup).map((s) => s.siblingGroup!.id)
        ).size,
      },
    }),
    [students]
  )

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
    <div className="space-y-6">
      {/* Summary Cards with improved grid and mobile layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Students Card */}
        <div className="motion-safe:animate-duration-500 rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md motion-safe:animate-fade-in sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Total Students
              </div>
              <div className="mt-2 flex items-baseline">
                <div className="text-2xl font-bold sm:text-3xl">
                  {stats.total}
                </div>
                <div className="ml-2 text-sm text-muted-foreground">
                  students
                </div>
              </div>
            </div>
            <Users className="h-5 w-5 text-muted-foreground sm:h-8 sm:w-8" />
          </div>
        </div>

        {/* Batch Assignment Card */}
        <div className="motion-safe:animate-delay-100 motion-safe:animate-duration-500 rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md motion-safe:animate-fade-in sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Batch Assignment
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Assigned</span>
                  <span className="font-medium">{stats.withBatch}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Unassigned</span>
                  <span className="font-medium text-orange-600">
                    {stats.unassigned}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-1000 ease-out"
                    style={{
                      width: `${(stats.withBatch / stats.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Siblings Card */}
        <div className="motion-safe:animate-delay-200 motion-safe:animate-duration-500 rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md motion-safe:animate-fade-in sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Siblings
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Students</span>
                  <span className="font-medium">
                    {stats.siblingGroups.studentsWithSiblings}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Groups</span>
                  <span className="font-medium">
                    {stats.siblingGroups.totalGroups}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Distribution - Spans 2 columns on larger screens */}
        <div className="motion-safe:animate-delay-300 motion-safe:animate-duration-500 col-span-1 rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md motion-safe:animate-fade-in sm:col-span-2 sm:p-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Status Distribution
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(stats.byStatus).map(([status, count], index) => (
              <div
                key={status}
                className="motion-safe:animate-duration-500 flex items-center justify-between motion-safe:animate-fade-in-up"
                style={{
                  animationDelay: `${400 + index * 100}ms`,
                }}
              >
                <span className="text-sm capitalize">{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Section - Improved mobile layout */}
      <div className="motion-safe:animate-delay-500 motion-safe:animate-duration-500 rounded-lg border bg-card p-4 shadow-sm motion-safe:animate-fade-in sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Top row with search and quick filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="Filter students..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full sm:w-[300px]"
              />
              <Select
                value=""
                onValueChange={(value) => {
                  // Find the preset from either common or batch filters
                  const preset =
                    allFilters.common.find((f) => f.id === value) ||
                    allFilters.batches.find((f) => f.id === value)

                  if (preset) {
                    // Apply the filter preset
                    applyPreset(preset)

                    // If it's a batch filter, ensure we update the batch filter state
                    if (preset.id.startsWith('batch-')) {
                      const batchId = preset.id.replace('batch-', '')
                      setBatchFilter(batchId)
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Quick Filters" />
                </SelectTrigger>
                <SelectContent>
                  {allFilters.batches.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Batch Filters</SelectLabel>
                      {allFilters.batches.map((preset) => (
                        <SelectItem
                          key={preset.id}
                          value={preset.id}
                          className="flex items-center justify-between"
                        >
                          <span>{preset.name}</span>
                          <span className="text-sm text-muted-foreground">
                            (
                            {batches.find((b) => b.id === preset.filters.batch)
                              ?.studentCount ?? 0}
                            )
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  <SelectGroup>
                    <SelectLabel>Common Filters</SelectLabel>
                    {allFilters.common.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredData.length} of {students.length} students
                </span>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Bottom row with main filters - Improved mobile layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-4">
            <div className="w-full">
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
            <div className="w-full">
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
            <div className="w-full">
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
      </div>

      {/* Table section */}
      <div className="rounded-lg border shadow-sm">
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
