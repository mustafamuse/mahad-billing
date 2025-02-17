'use client'

import { useState, useMemo } from 'react'

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table'

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

export function BatchesTable() {
  const { data: students = [], isLoading, error } = useBatchData()
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [siblingFilter, setSiblingFilter] = useState<
    'all' | 'with' | 'without'
  >('all')

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
  }, [students, statusFilter, siblingFilter, globalFilter])

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
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Filter students..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
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
                  : siblingFilter === 'with'
                    ? 'With Siblings'
                    : 'Without Siblings'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="with">With Siblings</SelectItem>
              <SelectItem value="without">Without Siblings</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={() => {
            console.log('📊 Current Table State:', {
              totalStudents: students.length,
              filteredStudents: rows.length,
              currentFilter: statusFilter,
              globalFilter,
              firstStudent: students[0],
            })
          }}
          className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          Debug Table
        </button>
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
    </div>
  )
}
