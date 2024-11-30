'use client'

import { useState } from 'react'
import React from 'react'

import { useQuery } from '@tanstack/react-query'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Ban,
  Tags,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { ProcessedStudent } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

const statusConfig = {
  all: {
    label: 'All Statuses',
    color: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    icon: AlertCircle,
  },
  active: {
    label: 'Active',
    color:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30',
    icon: CheckCircle2,
  },
  not_enrolled: {
    label: 'Not Enrolled',
    color: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    icon: XCircle,
  },
  past_due: {
    label: 'Past Due',
    color:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/30',
    icon: Clock,
  },
  unpaid: {
    label: 'Unpaid',
    color:
      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30',
    icon: AlertCircle,
  },
  canceled: {
    label: 'Canceled',
    color:
      'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-500/30',
    icon: Ban,
  },
} as const

const discountConfig = {
  all: {
    label: 'All Discounts',
    icon: Tags,
  },
  'Family Discount': {
    label: 'Fam',
    icon: Tags,
  },
  None: {
    label: 'None',
    icon: XCircle,
  },
  Other: {
    label: 'Other',
    icon: Tags,
  },
} as const

const rowsPerPageOptions = [10, 20, 30, 40, 50] as const

type SortOrder = 'asc' | 'desc'

interface SortConfig {
  field: string
  order: SortOrder
}

interface TableHeaderProps {
  table: {
    data: ProcessedStudent[]
    getFilteredSelectedRowModel: () => { rows: { length: number }[] }
    getFilteredRowModel: () => { rows: { length: number }[] }
  }
}

interface TableRowProps {
  row: ProcessedStudent
}

export function SubscriptionTable() {
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] =
    useState<(typeof rowsPerPageOptions)[number]>(10)
  const [cursor, setCursor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<keyof typeof statusConfig>('active')
  const [discountType, setDiscountType] =
    useState<keyof typeof discountConfig>('all')
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    order: 'asc',
  })
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  const handleSort = (field: string) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }))
  }

  const { data, isLoading } = useQuery({
    queryKey: [
      'subscriptions',
      page,
      rowsPerPage,
      cursor,
      search,
      status,
      discountType,
      sortConfig,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: rowsPerPage.toString(),
      })

      if (cursor) params.set('cursor', cursor)
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)
      if (discountType !== 'all') params.set('discountType', discountType)
      if (sortConfig.field) {
        params.set('sortBy', sortConfig.field)
        params.set('sortOrder', sortConfig.order)
      }

      const response = await fetch(`/api/admin/dashboard?${params}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to fetch students')
      }
      const responseData = await response.json()
      return {
        ...responseData,
        totalCount:
          responseData.totalCount || responseData.students?.length || 0,
      }
    },
  })

  const handleSelectAll = (checked: boolean | string) => {
    if (checked === true && data?.students) {
      setSelectedRows(new Set(data.students.map((s: ProcessedStudent) => s.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (studentId: string, checked: boolean | string) => {
    const newSelected = new Set(selectedRows)
    if (checked === true) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedRows(newSelected)
  }

  const columns = [
    {
      id: 'select',
      header: ({ table: _table }: TableHeaderProps) => (
        <Checkbox
          checked={
            data?.students?.length > 0 &&
            selectedRows.size === data.students.length
          }
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }: TableRowProps) => (
        <Checkbox
          checked={selectedRows.has(row.id)}
          onCheckedChange={(checked) => handleSelectRow(row.id, checked)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
    },
    { key: 'name', label: 'Student Name' },
    { key: 'payer', label: 'Payer' },
    { key: 'status', label: 'Status' },
    { key: 'nextPayment', label: 'Next Payment' },
    { key: 'monthlyAmount', label: 'Monthly Amount' },
    { key: 'discount', label: 'Discount' },
  ]

  const renderFilterSummary = () => {
    if (!data) return null

    if (status === 'active') {
      return (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                {data.activeCount} active students
              </span>
              <span className="ml-2 text-muted-foreground">
                out of {data.totalStudents} total students
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg font-medium text-green-600 dark:text-green-400">
                {formatCurrency(data.activeRevenue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg. {formatCurrency(data.averageActiveRevenue)} per
                student/month
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (status === 'not_enrolled') {
      return (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                {data.unenrolledCount} students not enrolled
              </span>
              <span className="ml-2 text-muted-foreground">
                out of {data.totalStudents} total students
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Monthly Revenue Opportunity
              </div>
              <div className="text-lg font-medium text-green-600 dark:text-green-400">
                {formatCurrency(data.potentialRevenue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Including applicable family discounts
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (status === 'past_due' || status === 'unpaid') {
      return (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-red-600 dark:text-red-400">
                {data.pastDueCount} students with outstanding payments
              </span>
              <span className="ml-2 text-muted-foreground">
                requiring immediate attention
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg font-medium text-red-600 dark:text-red-400">
                {formatCurrency(data.pastDueRevenue)}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg. {formatCurrency(data.averagePastDueAmount)} per student
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (status === 'canceled') {
      return (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                {data.canceledCount} canceled enrollments
              </span>
              <span className="ml-2 text-muted-foreground">
                ({data.lastMonthCanceled} in the last month)
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Lost Monthly Revenue
              </div>
              <div className="text-lg font-medium text-gray-600 dark:text-gray-400">
                {formatCurrency(data.canceledRevenue)}
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (discountType === 'Family Discount') {
      return (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                {data.familyDiscountCount} students with family discounts
              </span>
              <span className="ml-2 text-muted-foreground">
                out of {data.totalStudents} total students
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Total Monthly Discounts
              </div>
              <div className="text-lg font-medium text-blue-600 dark:text-blue-400">
                {formatCurrency(data.familyDiscountTotal)}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg. {formatCurrency(data.averageFamilyDiscount)} per student
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (discountType === 'None') {
      return (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                {data.noDiscountCount} students paying full tuition
              </span>
              <span className="ml-2 text-muted-foreground">
                (
                {((data.noDiscountCount / data.totalStudents) * 100).toFixed(1)}
                % of total students)
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Full Rate Revenue
              </div>
              <div className="text-lg font-medium">
                {formatCurrency(data.noDiscountRevenue)}
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (search) {
      const activeInSearch =
        data?.students.filter((s: { status: string }) => s.status === 'active')
          .length || 0
      const notEnrolledInSearch =
        data?.students.filter(
          (s: { status: string }) => s.status === 'not_enrolled'
        ).length || 0
      const pastDueInSearch =
        data?.students.filter(
          (s: { status: string }) =>
            s.status === 'past_due' || s.status === 'unpaid'
        ).length || 0

      return (
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">
                Found {data.filteredCount} matches
              </span>
              <span className="ml-2 text-muted-foreground">
                for &quot;{search}&quot;
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Status Breakdown
              </div>
              <div className="space-x-2 text-sm">
                <span className="text-green-600 dark:text-green-400">
                  {activeInSearch} active
                </span>
                <span>·</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {notEnrolledInSearch} not enrolled
                </span>
                {pastDueInSearch > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-red-600 dark:text-red-400">
                      {pastDueInSearch} past due
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // Get the correct total count based on the current filter
  const getTotalFilteredCount = () => {
    if (!data) return 0

    if (status === 'active') return data.activeCount
    if (status === 'not_enrolled') return data.unenrolledCount
    if (status === 'past_due') return data.pastDueCount
    if (status === 'canceled') return data.canceledCount
    if (discountType === 'Family Discount') return data.familyDiscountCount
    if (discountType === 'None') return data.noDiscountCount
    if (search) return data.filteredCount

    return data.totalCount
  }

  // Update pagination calculation
  const totalEntries = getTotalFilteredCount()
  const currentPageCount = data?.students?.length || 0
  const startEntry = currentPageCount > 0 ? (page - 1) * rowsPerPage + 1 : 0
  const endEntry = startEntry + currentPageCount - 1

  return (
    <div>
      <div className="space-y-4 p-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-[350px] flex-grow">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by student name..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="h-10 w-full pl-10 pr-4"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={status}
              onValueChange={(value: keyof typeof statusConfig) =>
                setStatus(value)
              }
            >
              <SelectTrigger className="h-10 w-[180px]">
                <SelectValue>{statusConfig[status].label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(statusConfig) as [
                    keyof typeof statusConfig,
                    (typeof statusConfig)[keyof typeof statusConfig],
                  ][]
                ).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex min-w-[100px] items-center gap-2">
                      <config.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={discountType}
              onValueChange={(value: keyof typeof discountConfig) =>
                setDiscountType(value)
              }
            >
              <SelectTrigger className="h-10 w-[180px]">
                <SelectValue>{discountConfig[discountType].label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(discountConfig) as [
                    keyof typeof discountConfig,
                    (typeof discountConfig)[keyof typeof discountConfig],
                  ][]
                ).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex min-w-[100px] items-center gap-2">
                      <config.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        {renderFilterSummary()}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column, i) => (
                  <TableHead
                    key={i}
                    className={cn(
                      'h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
                      column.key && 'cursor-pointer hover:text-foreground'
                    )}
                    onClick={() => column.key && handleSort(column.key)}
                  >
                    {column.header ? (
                      column.header({
                        table: {
                          data: data?.students || [],
                          getFilteredSelectedRowModel: () => ({ rows: [] }),
                          getFilteredRowModel: () => ({ rows: [] }),
                        },
                      })
                    ) : (
                      <div className="flex items-center gap-1">
                        {column.label}
                        {column.key && (
                          <ArrowUpDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              sortConfig.field === column.key &&
                                sortConfig.order === 'desc' &&
                                'rotate-180'
                            )}
                          />
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.students?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                data?.students?.map((student: ProcessedStudent) => (
                  <TableRow key={student.id} className="hover:bg-muted/50">
                    <TableCell className="h-12 px-4 [&:has([role=checkbox])]:pr-0">
                      <Checkbox
                        checked={selectedRows.has(student.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRow(student.id, checked)
                        }
                        aria-label="Select row"
                        className="translate-y-[2px]"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-2 font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span>
                          {student.guardian.name || 'No payer assigned'}
                        </span>
                        {student.guardian.email && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{student.guardian.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          'inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5',
                          statusConfig[
                            student.status as keyof typeof statusConfig
                          ].color
                        )}
                      >
                        {React.createElement(
                          statusConfig[
                            student.status as keyof typeof statusConfig
                          ].icon,
                          {
                            className: 'h-3.5 w-3.5 shrink-0',
                          }
                        )}
                        <span className="truncate">
                          {
                            statusConfig[
                              student.status as keyof typeof statusConfig
                            ].label
                          }
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {student.currentPeriodEnd
                        ? new Date(
                            student.currentPeriodEnd * 1000
                          ).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {formatCurrency(student.monthlyAmount)}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {student.discount.amount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="inline-flex items-center gap-1.5 whitespace-nowrap bg-blue-50 px-2 py-0.5 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30"
                        >
                          <Tags className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {discountConfig[
                              student.discount
                                .type as keyof typeof discountConfig
                            ]?.label || student.discount.type}{' '}
                            ({formatCurrency(student.discount.amount)})
                          </span>
                        </Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>None</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer with Pagination and Toolbar */}
      <div className="border-t">
        <div className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          {/* Selection and Rows Per Page */}
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row">
            <div>
              {selectedRows.size} of {totalEntries} row(s) selected
            </div>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  const newValue = parseInt(
                    value
                  ) as (typeof rowsPerPageOptions)[number]
                  setRowsPerPage(newValue)
                  setPage(1)
                  setCursor(null)
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue>{rowsPerPage}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rowsPerPageOptions.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-end gap-4">
            <div className="text-sm text-muted-foreground">
              {currentPageCount > 0 ? (
                <>
                  Showing {startEntry} to {endEntry} of {totalEntries} entries
                </>
              ) : (
                <>No entries to show</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (page > 1) {
                    setPage(page - 1)
                    setCursor(null)
                  }
                }}
                disabled={page === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (data?.hasMore) {
                    setPage(page + 1)
                    setCursor(data.nextCursor)
                  }
                }}
                disabled={!data?.hasMore || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
