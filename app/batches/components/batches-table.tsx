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

  const filteredData = useMemo(() => {
    let result = students

    // First apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((student) => student.status === statusFilter)
    }

    // Then apply global search filter
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
  }, [students, statusFilter, globalFilter])

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
