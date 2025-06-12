'use client'

import { useState, useEffect } from 'react'

import type { Batch } from '@prisma/client'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  InfoIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ExcludedCharge {
  studentName: string
  studentEmail: string
  customerEmail: string
  chargeAmount: number
  chargeId: string
  invoiceId: string | null
  payoutId: string
  customerId?: string
}

interface StudentInfo {
  studentName: string
  studentEmail: string
  customerEmail: string
  chargesFound: number
  batchId: string
  customerId?: string
}

interface CalculationResult {
  totalPayoutAmount: number
  totalDeductions: number
  finalAdjustedPayout: number
  payoutsFound: number
  excludedCharges: ExcludedCharge[]
  exclusionSummary: StudentInfo[]
}

interface ProfitShareCalculatorProps {
  batches: Batch[]
}

export function ProfitShareCalculator({ batches }: ProfitShareCalculatorProps) {
  const [date, setDate] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = useState(false)

  const handlePreviousMonth = () => {
    setDate((prev) => {
      if (prev.month === 1) {
        return { month: 12, year: prev.year - 1 }
      }
      return { ...prev, month: prev.month - 1 }
    })
  }

  const handleNextMonth = () => {
    setDate((prev) => {
      if (prev.month === 12) {
        return { month: 1, year: prev.year + 1 }
      }
      return { ...prev, month: prev.month + 1 }
    })
  }

  const handleBatchToggle = (batchId: string) => {
    const isSelected = selectedBatchIds.includes(batchId)
    if (isSelected) {
      setSelectedBatchIds(selectedBatchIds.filter((id) => id !== batchId))
    } else {
      setSelectedBatchIds([...selectedBatchIds, batchId])
    }
  }

  const handleCalculate = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      console.log('Starting calculation...')
      const response = await fetch('/api/admin/profit-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: date.year,
          month: date.month,
          batchIds: selectedBatchIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setResult(data)
      console.log('Calculation completed:', data)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred'
      console.error('Calculation failed:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Update the activeTab when result changes
  useEffect(() => {
    if (result && Object.keys(chargesByBatch).length > 0) {
      setActiveTab(Object.keys(chargesByBatch)[0])
    }
  }, [result])

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }))

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  )

  // Update the chargesByBatch calculation to only include students whose batchId matches the batch.id
  const chargesByBatch = batches
    .filter((batch) => selectedBatchIds.includes(batch.id))
    .reduce(
      (acc, batch) => {
        // Debug log to check student and batch data
        if (result?.exclusionSummary?.length) {
          console.log('Batch:', batch.id, batch.name)
          console.log('First 3 students:', result.exclusionSummary.slice(0, 3))
        }
        // Get students for this batch only
        const batchStudents = (result?.exclusionSummary || []).filter(
          (student) => student.batchId === batch.id
        )

        if (!acc[batch.name]) acc[batch.name] = []

        batchStudents.forEach((student) => {
          // Find any charges for this student
          const studentCharges =
            result?.excludedCharges.filter(
              (charge) => charge.studentEmail === student.studentEmail
            ) || []

          if (studentCharges.length > 0) {
            acc[batch.name].push(...studentCharges)
          } else {
            acc[batch.name].push({
              studentName: student.studentName,
              studentEmail: student.studentEmail,
              customerEmail: student.customerEmail,
              chargeAmount: 0,
              chargeId: '',
              invoiceId: null,
              payoutId: '',
              customerId: student.customerId,
            })
          }
        })

        return acc
      },
      {} as Record<string, ExcludedCharge[]>
    )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Month Selection Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Select Month</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover
              open={isMonthSelectorOpen}
              onOpenChange={setIsMonthSelectorOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isMonthSelectorOpen}
                  className="w-full justify-between"
                >
                  <span>
                    {months[date.month - 1]?.label} {date.year}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="grid">
                  <div className="flex items-center justify-between border-b p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePreviousMonth}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {months[date.month - 1]?.label} {date.year}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNextMonth}
                      disabled={
                        date.year === new Date().getFullYear() &&
                        date.month >= new Date().getMonth() + 1
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-72">
                    <div className="grid grid-cols-1 p-2">
                      {years.map((year) => (
                        <div key={year} className="mb-4">
                          <div className="sticky top-0 mb-2 bg-background px-2 py-1 text-sm font-medium">
                            {year}
                          </div>
                          {months.map((month) => (
                            <Button
                              key={`${year}-${month.value}`}
                              variant="ghost"
                              className="w-full justify-start px-2 py-1.5"
                              disabled={
                                year === new Date().getFullYear() &&
                                month.value > new Date().getMonth() + 1
                              }
                              onClick={() => {
                                setDate({ month: month.value, year })
                                setIsMonthSelectorOpen(false)
                              }}
                            >
                              <span
                                className={
                                  date.month === month.value &&
                                  date.year === year
                                    ? 'font-medium text-primary'
                                    : ''
                                }
                              >
                                {month.label}
                              </span>
                            </Button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Batch Selection Card */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Select Batches
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Select the batches to include in the profit share
                    calculation
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[120px] pr-4">
              <div className="space-y-4">
                {batches.map((batch) => (
                  <div key={batch.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={batch.id}
                      checked={selectedBatchIds.includes(batch.id)}
                      onCheckedChange={() => handleBatchToggle(batch.id)}
                    />
                    <Label
                      htmlFor={batch.id}
                      className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {batch.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleCalculate}
          disabled={isLoading || selectedBatchIds.length === 0}
          className="w-full md:w-auto"
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Calculating...
            </>
          ) : (
            'Calculate Profit Share'
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Gross Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  $
                  {(result.totalPayoutAmount / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on {result.payoutsFound} payouts
                </div>
                <div className="absolute right-0 top-0 h-full w-[4px] bg-blue-500" />
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Deductions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  -$
                  {(result.totalDeductions / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  From selected batches
                </div>
                <div className="absolute right-0 top-0 h-full w-[4px] bg-red-500" />
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Final Adjusted Payout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  $
                  {(result.finalAdjustedPayout / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Net profit share amount
                </div>
                <div className="absolute right-0 top-0 h-full w-[4px] bg-green-500" />
              </CardContent>
            </Card>
          </div>

          {/* Batch Details Tabs */}
          {Object.keys(chargesByBatch).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Batch Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    {Object.entries(chargesByBatch).map(
                      ([batchName, students]) => (
                        <TabsTrigger
                          key={batchName}
                          value={batchName}
                          className="flex-1"
                        >
                          <span>{batchName}</span>
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                            {students.length}
                          </span>
                        </TabsTrigger>
                      )
                    )}
                  </TabsList>
                  {Object.entries(chargesByBatch).map(
                    ([batchName, students]) => (
                      <TabsContent key={batchName} value={batchName}>
                        <div className="rounded-lg border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Customer Email</TableHead>
                                <TableHead className="text-right">
                                  Charge Amount
                                </TableHead>
                                <TableHead>Payment Details</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.map((student, studentIndex) => (
                                <TableRow
                                  key={`${student.studentEmail}-${studentIndex}`}
                                  className={
                                    student.chargeAmount === 0
                                      ? 'bg-muted/30'
                                      : undefined
                                  }
                                >
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {student.studentName}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {student.studentEmail}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div>{student.customerEmail}</div>
                                      {student.customerId ? (
                                        <a
                                          href={`https://dashboard.stripe.com/customers/${student.customerId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                        >
                                          View Profile{' '}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {student.chargeAmount > 0 ? (
                                      <span className="font-semibold text-red-600">
                                        -$
                                        {(
                                          student.chargeAmount / 100
                                        ).toLocaleString('en-US', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        No charges
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {student.chargeAmount > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs">
                                            Payout
                                          </span>
                                          <a
                                            href={`https://dashboard.stripe.com/payouts/${student.payoutId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                          >
                                            {student.payoutId.slice(-8)}{' '}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs">
                                            Charge
                                          </span>
                                          <a
                                            href={`https://dashboard.stripe.com/payments/${student.chargeId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                          >
                                            {student.chargeId.slice(-8)}{' '}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        </div>
                                        {student.invoiceId && (
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs">
                                              Invoice
                                            </span>
                                            <a
                                              href={`https://dashboard.stripe.com/invoices/${student.invoiceId}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                            >
                                              {student.invoiceId.slice(-8)}{' '}
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    )
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
