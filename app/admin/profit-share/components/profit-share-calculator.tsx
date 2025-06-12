'use client'

import { useState } from 'react'

import type { Batch } from '@prisma/client'
import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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


interface ExcludedCharge {
  studentName: string
  studentEmail: string
  customerEmail: string
  chargeAmount: number
  chargeId: string
  invoiceId: string | null
  payoutId: string
}

interface StudentInfo {
  studentName: string
  studentEmail: string
  customerEmail: string
  chargesFound: number
  batchId: string
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

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  )
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }))

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
            })
          }
        })

        return acc
      },
      {} as Record<string, ExcludedCharge[]>
    )

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Select
            value={String(date.year)}
            onValueChange={(value) => setDate({ ...date, year: Number(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="month">Month</Label>
          <Select
            value={String(date.month)}
            onValueChange={(value) =>
              setDate({ ...date, month: Number(value) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Select Batches ({selectedBatchIds.length} selected)</Label>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {batches.map((batch) => (
                <div key={batch.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={batch.id}
                    checked={selectedBatchIds.includes(batch.id)}
                    onCheckedChange={() => handleBatchToggle(batch.id)}
                  />
                  <Label
                    htmlFor={batch.id}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {batch.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleCalculate} disabled={isLoading}>
        {isLoading ? 'Calculating...' : 'Calculate Adjusted Payout'}
      </Button>

      {error && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-8">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                Summary for {months[date.month - 1]?.label} {date.year}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Total Gross Payouts:
                  </span>
                  <span className="text-lg font-semibold">
                    ${(result.totalPayoutAmount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Total Deductions:
                  </span>
                  <span className="text-lg font-semibold text-red-500">
                    -${(result.totalDeductions / 100).toFixed(2)}
                  </span>
                </div>
                <div className="my-2 border-t border-muted-foreground/20" />
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">
                    Final Adjusted Payout:
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    ${(result.finalAdjustedPayout / 100).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on {result.payoutsFound} payouts
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Render a table for each selected batch */}
          {Object.entries(chargesByBatch).map(([batchName, students]) => (
            <div key={batchName} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{batchName}</h2>
                <span className="text-sm text-muted-foreground">
                  {students.length} students
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border bg-background">
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
                          student.chargeAmount === 0 ? 'bg-muted/30' : undefined
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
                            <a
                              href={`https://dashboard.stripe.com/customers?email=${encodeURIComponent(
                                student.customerEmail
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                            >
                              View Profile <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {student.chargeAmount > 0 ? (
                            <span className="font-semibold text-red-600">
                              -${(student.chargeAmount / 100).toFixed(2)}
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
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No payment details
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
