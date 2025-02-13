'use client'

import { useState } from 'react'

import { SubscriptionStatus } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Users,
  Wallet,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  SearchX,
  FileX,
  RefreshCcw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { PayorDetailsSlider } from './components/payor-details-slider'

interface Student {
  id: string
  name: string
  payerName: string
  monthlyAmount: number
  nextPaymentDate: string
  status: SubscriptionStatus
  payerEmail?: string
  payerPhone?: string
}

interface SubscriptionResponse {
  students: Student[]
}

type SortField = keyof Pick<
  Student,
  'name' | 'payerName' | 'monthlyAmount' | 'nextPaymentDate'
>

async function fetchSubscriptions(): Promise<SubscriptionResponse> {
  const response = await fetch('/api/admin/subscriptions')
  if (!response.ok) {
    throw new Error('Failed to fetch subscriptions')
  }
  return response.json()
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string
  value: string
  icon: React.ElementType
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline space-x-2">
              <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
              {trend && (
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend.isPositive ? '+' : '-'}
                  {trend.value}%
                </span>
              )}
            </div>
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/5 via-primary/50 to-primary/5" />
    </Card>
  )
}

function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string
  description: string
  icon: React.ElementType
  action?: {
    label: string
    onClick: () => void
  }
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center animate-in fade-in-50">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function SubscriptionTable() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedPayor, setSelectedPayor] = useState<{
    name: string
    email: string
    phone: string
    students: Student[]
  } | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    field: SortField | ''
    direction: 'asc' | 'desc'
  }>({ field: '', direction: 'asc' })

  const { data, isLoading, error } = useQuery<SubscriptionResponse>({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
  })

  const students = data?.students || []

  const filteredAndSortedData = students
    .filter((student) => {
      const matchesSearch =
        searchQuery === '' ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.payerName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        student.status === (statusFilter.toUpperCase() as SubscriptionStatus)

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (!sortConfig.field) return 0
      const direction = sortConfig.direction === 'asc' ? 1 : -1
      const aValue = a[sortConfig.field]
      const bValue = b[sortConfig.field]
      return aValue > bValue ? direction : -direction
    })

  const toggleRow = (studentId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (expandedRows.has(studentId)) {
      newExpandedRows.delete(studentId)
    } else {
      newExpandedRows.add(studentId)
    }
    setExpandedRows(newExpandedRows)
  }

  const handleSort = (field: SortField) => {
    setSortConfig((current) => ({
      field,
      direction:
        current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return 'bg-green-100 text-green-800'
      case SubscriptionStatus.PAST_DUE:
        return 'bg-yellow-100 text-yellow-800'
      case SubscriptionStatus.CANCELED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Calculate summary statistics
  const totalStudents = data?.students.length || 0
  const activeStudents =
    data?.students.filter((s) => s.status === SubscriptionStatus.ACTIVE)
      .length || 0
  const totalRevenue =
    data?.students.reduce((sum, s) => sum + s.monthlyAmount, 0) || 0
  const averageRevenue = totalStudents ? totalRevenue / totalStudents : 0

  const getEmptyStateProps = () => {
    // If there's a search query but no results
    if (searchQuery && filteredAndSortedData.length === 0) {
      return {
        icon: SearchX,
        title: 'No matching students found',
        description: `No students found matching "${searchQuery}". Try adjusting your search.`,
        action: {
          label: 'Clear search',
          onClick: () => setSearchQuery(''),
        },
      }
    }

    // If there's a status filter but no results
    if (statusFilter !== 'all' && filteredAndSortedData.length === 0) {
      return {
        icon: FileX,
        title: `No ${statusFilter} subscriptions`,
        description: `There are no subscriptions with ${statusFilter} status.`,
        action: {
          label: 'Show all subscriptions',
          onClick: () => setStatusFilter('all'),
        },
      }
    }

    // If there's no data at all
    if (students.length === 0) {
      return {
        icon: Users,
        title: 'No subscriptions found',
        description: 'No subscriptions have been created yet.',
        action: {
          label: 'Refresh data',
          onClick: () => window.location.reload(),
        },
      }
    }

    return null
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">Error loading subscriptions</div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Stats Grid Loading State */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="relative overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-4 w-48" />
              </div>
            </Card>
          ))}
        </div>

        {/* Table Loading State */}
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-10 w-[300px]" />
                <Skeleton className="h-10 w-[180px]" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={totalStudents.toString()}
          icon={Users}
          description="Total enrolled students"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Subscriptions"
          value={activeStudents.toString()}
          icon={CheckCircle2}
          description="Currently active subscriptions"
          trend={{ value: 4, isPositive: true }}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={Wallet}
          description="Total monthly recurring revenue"
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Average Revenue"
          value={`$${averageRevenue.toFixed(2)}`}
          icon={AlertCircle}
          description="Average revenue per student"
          trend={{ value: 2, isPositive: false }}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between p-6">
          <div className="flex flex-1 items-center space-x-2">
            <Input
              placeholder="Filter students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-[300px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAST_DUE">Past Due</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(searchQuery || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
              }}
              className="ml-2"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset filters
            </Button>
          )}
        </div>

        {filteredAndSortedData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:bg-transparent"
                  >
                    Student
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('payerName')}
                    className="flex items-center gap-1 hover:bg-transparent"
                  >
                    Payer
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('monthlyAmount')}
                    className="flex items-center gap-1 hover:bg-transparent"
                  >
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('nextPaymentDate')}
                    className="flex items-center gap-1 hover:bg-transparent"
                  >
                    Next Payment
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((student) => (
                <>
                  <TableRow key={student.id} className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRow(student.id)}
                        className="h-8 w-8 p-0 hover:bg-transparent"
                      >
                        {expandedRows.has(student.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{student.name}</div>
                    </TableCell>
                    <TableCell>{student.payerName}</TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          getStatusColor(student.status)
                        )}
                      >
                        {student.status.toLowerCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${student.monthlyAmount}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.nextPaymentDate
                        ? format(
                            new Date(student.nextPaymentDate),
                            'MMM d, yyyy'
                          )
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-transparent"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              // Group all students for this payor
                              const payorStudents =
                                filteredAndSortedData.filter(
                                  (s) => s.payerName === student.payerName
                                )
                              setSelectedPayor({
                                name: student.payerName,
                                email: student.payerEmail || '',
                                phone: student.payerPhone || '',
                                students: payorStudents,
                              })
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem>Update payment</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Cancel subscription
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(student.id) && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <div className="bg-muted/50 p-4">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {student.payerEmail || 'No email provided'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {student.payerPhone || 'No phone provided'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-6 pb-6">
            <EmptyState {...getEmptyStateProps()!} />
          </div>
        )}
      </Card>
      {selectedPayor && (
        <PayorDetailsSlider
          isOpen={true}
          onClose={() => setSelectedPayor(null)}
          payorName={selectedPayor.name}
          payorEmail={selectedPayor.email}
          payorPhone={selectedPayor.phone}
          students={selectedPayor.students}
        />
      )}
    </div>
  )
}
