'use client'

import { useState, useMemo } from 'react'

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { saveAs } from 'file-saver'
import { Users, GraduationCap, Users2, BarChart3, Download } from 'lucide-react'
import { toast } from 'sonner'

import { ThemeToggle } from '@/components/theme-toggle'
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
import { exportIncompleteStudents } from '@/lib/actions/batch-actions'
import type { BatchStudentData } from '@/lib/actions/get-batch-data'
import { getStudentCompleteness } from '@/lib/utils/student-validation'

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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)

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

    // Apply incomplete filter
    if (showIncompleteOnly) {
      result = result.filter((student) => {
        const { isComplete } = getStudentCompleteness(student)
        return !isComplete
      })
    }

    return result
  }, [
    students,
    statusFilter,
    siblingFilter,
    batchFilter,
    globalFilter,
    showIncompleteOnly,
  ])

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

  // Add incomplete count calculation
  const incompleteCount = useMemo(() => {
    return students.filter((student) => {
      const { isComplete } = getStudentCompleteness(student)
      return !isComplete
    }).length
  }, [students])

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

  const handleExport = async () => {
    try {
      const b64 = await exportIncompleteStudents()

      // Convert base64 to blob
      const byteCharacters = atob(b64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)

      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      })

      saveAs(
        blob,
        `incomplete-students-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      )
      toast.success('Export completed successfully')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export incomplete students')
    }
  }

  const table = useReactTable<BatchStudentData>({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
      columnFilters,
      columnVisibility,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    filterFns: {
      incomplete: (row, _, filterValue) => {
        if (!filterValue) return true
        const { isComplete } = getStudentCompleteness(row.original)
        return !isComplete
      },
    },
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
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards - Improved mobile grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {/* Total Students - Full width on mobile */}
        <div className="motion-safe:animate-duration-500 rounded-lg border bg-card p-4 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-md motion-safe:animate-fade-in sm:p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
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
            <Users className="h-5 w-5 shrink-0 text-muted-foreground sm:h-8 sm:w-8" />
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

        {/* Status Distribution - Full width on mobile */}
        <div className="col-span-1 rounded-lg border bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Status Distribution
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
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

      {/* Filter Section - Better mobile layout */}
      <div className="rounded-lg border bg-card p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
          {/* Search and Quick Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Filter students..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full sm:w-[300px]"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                  className={showIncompleteOnly ? 'bg-muted' : ''}
                >
                  Show Incomplete ({incompleteCount})
                </Button>
                {showIncompleteOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="duration-300 animate-in fade-in slide-in-from-left-5"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export {incompleteCount}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              )}
              <Select
                value=""
                onValueChange={(value) => {
                  const preset =
                    allFilters.common.find((f) => f.id === value) ||
                    allFilters.batches.find((f) => f.id === value)
                  if (preset) applyPreset(preset)
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Quick Filters" />
                </SelectTrigger>
                <SelectContent align="end" className="w-[280px]">
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
              <ThemeToggle />
            </div>
          </div>

          {/* Main Filters */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
            {/* Each filter takes full width on mobile */}
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

      {/* Table Section - Horizontal scroll on mobile */}
      <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:shadow-sm">
        <div className="min-w-full">
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
    </div>
  )
}
