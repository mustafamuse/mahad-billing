'use client'

import { useState, useEffect } from 'react'

import { AlertCircle, CheckCircle } from 'lucide-react'
import { Toaster } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { PayerHeader } from './payer-header'

interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string
  batchId: string | null
  payerId: string | null
  batch: {
    name: string
  } | null
  payer: {
    id: string
    name: string
    email: string
    phone: string
    stripeCustomerId: string | null
    relationship: string | null
  } | null
}

interface PayerGroup {
  payer: {
    id: string
    name: string
    email: string
    phone: string
    stripeCustomerId: string | null
    relationship: string | null
    hasStripe: boolean
  }
  students: Student[]
  studentCount: number
}

interface PayerResponse {
  summary: {
    totalStudents: number
    withPayer: number
    withoutPayer: number
    withStripe: number
    withoutStripe: number
  }
  payerGroups: PayerGroup[]
  studentsWithoutPayer: Student[]
}

export default function StudentPayersPage() {
  const [data, setData] = useState<PayerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  const fetchStudentPayers = async (filter: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/admin/students/payers?filter=${filter}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch student payers')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudentPayers(activeTab)
  }, [activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  if (loading && !data) {
    return (
      <div className="container mx-auto py-10">
        <PayerHeader />
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
        <PayerHeader />
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <p>Error: {error}</p>
          <Button
            onClick={() => fetchStudentPayers(activeTab)}
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
      <PayerHeader />
      <Toaster />

      {data && (
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.summary.totalStudents}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">With Payer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {data.summary.withPayer}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.summary.totalStudents > 0
                    ? Math.round(
                        (data.summary.withPayer / data.summary.totalStudents) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Without Payer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {data.summary.withoutPayer}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.summary.totalStudents > 0
                    ? Math.round(
                        (data.summary.withoutPayer /
                          data.summary.totalStudents) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Missing Stripe ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {data.summary.withoutStripe}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.summary.withPayer > 0
                    ? Math.round(
                        (data.summary.withoutStripe / data.summary.withPayer) *
                          100
                      )
                    : 0}
                  % of payers
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Students</TabsTrigger>
          <TabsTrigger value="with-payer">With Payer</TabsTrigger>
          <TabsTrigger value="without-payer">Without Payer</TabsTrigger>
          <TabsTrigger value="with-stripe">With Stripe</TabsTrigger>
          <TabsTrigger value="without-stripe">Missing Stripe</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-8">
          {data && (
            <>
              {data.payerGroups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Students with Payers</CardTitle>
                    <CardDescription>
                      Students grouped by their assigned payer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.payerGroups.map((group) => (
                      <div
                        key={group.payer.id}
                        className="mb-8 overflow-hidden rounded-lg border"
                      >
                        <div className="flex items-center justify-between bg-muted p-4">
                          <div>
                            <h3 className="flex items-center gap-2 text-lg font-semibold">
                              {group.payer.name}
                              {group.payer.hasStripe ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-700 text-white"
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Has Stripe
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-red-700 text-white"
                                >
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                  No Stripe
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {group.payer.email} • {group.payer.phone} •{' '}
                              {group.payer.relationship ||
                                'No relationship specified'}
                            </p>
                            {group.payer.stripeCustomerId && (
                              <p className="mt-1 font-mono text-xs">
                                Stripe ID: {group.payer.stripeCustomerId}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {group.studentCount} student
                              {group.studentCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Batch</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.students.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">
                                  {student.name}
                                </TableCell>
                                <TableCell>{student.email || '-'}</TableCell>
                                <TableCell>{student.phone || '-'}</TableCell>
                                <TableCell>{student.status}</TableCell>
                                <TableCell>
                                  {student.batch ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-blue-700 text-white"
                                    >
                                      {student.batch.name}
                                    </Badge>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {data.studentsWithoutPayer.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Students without Payers</CardTitle>
                    <CardDescription>
                      Students that don't have an assigned payer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Batch</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.studentsWithoutPayer.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell>{student.email || '-'}</TableCell>
                            <TableCell>{student.phone || '-'}</TableCell>
                            <TableCell>{student.status}</TableCell>
                            <TableCell>
                              {student.batch ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-700 text-white"
                                >
                                  {student.batch.name}
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="with-payer">
          {data && data.payerGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Students with Payers</CardTitle>
                <CardDescription>
                  Students that have an assigned payer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.payerGroups.map((group) => (
                  <div
                    key={group.payer.id}
                    className="mb-8 overflow-hidden rounded-lg border"
                  >
                    <div className="flex items-center justify-between bg-muted p-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                          {group.payer.name}
                          {group.payer.hasStripe ? (
                            <Badge
                              variant="outline"
                              className="bg-green-700 text-white"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Has Stripe
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-red-700 text-white"
                            >
                              <AlertCircle className="mr-1 h-3 w-3" />
                              No Stripe
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {group.payer.email} • {group.payer.phone} •{' '}
                          {group.payer.relationship ||
                            'No relationship specified'}
                        </p>
                        {group.payer.stripeCustomerId && (
                          <p className="mt-1 font-mono text-xs">
                            Stripe ID: {group.payer.stripeCustomerId}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {group.studentCount} student
                          {group.studentCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Batch</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.name}
                            </TableCell>
                            <TableCell>{student.email || '-'}</TableCell>
                            <TableCell>{student.phone || '-'}</TableCell>
                            <TableCell>{student.status}</TableCell>
                            <TableCell>
                              {student.batch ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-700 text-white"
                                >
                                  {student.batch.name}
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="without-payer">
          {data && data.studentsWithoutPayer.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Students without Payers</CardTitle>
                <CardDescription>
                  Students that don't have an assigned payer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.studentsWithoutPayer.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell>{student.email || '-'}</TableCell>
                        <TableCell>{student.phone || '-'}</TableCell>
                        <TableCell>{student.status}</TableCell>
                        <TableCell>
                          {student.batch ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-700 text-white"
                            >
                              {student.batch.name}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="with-stripe">
          {data && (
            <Card>
              <CardHeader>
                <CardTitle>Students with Stripe ID</CardTitle>
                <CardDescription>
                  Students whose payers have a Stripe customer ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.payerGroups
                  .filter((group) => group.payer.hasStripe)
                  .map((group) => (
                    <div
                      key={group.payer.id}
                      className="mb-8 overflow-hidden rounded-lg border"
                    >
                      <div className="flex items-center justify-between bg-muted p-4">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold">
                            {group.payer.name}
                            <Badge
                              variant="outline"
                              className="bg-green-700 text-white"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Has Stripe
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {group.payer.email} • {group.payer.phone} •{' '}
                            {group.payer.relationship ||
                              'No relationship specified'}
                          </p>
                          <p className="mt-1 font-mono text-xs">
                            Stripe ID: {group.payer.stripeCustomerId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {group.studentCount} student
                            {group.studentCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Batch</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.students.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">
                                {student.name}
                              </TableCell>
                              <TableCell>{student.email || '-'}</TableCell>
                              <TableCell>{student.phone || '-'}</TableCell>
                              <TableCell>{student.status}</TableCell>
                              <TableCell>
                                {student.batch ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-700 text-white"
                                  >
                                    {student.batch.name}
                                  </Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="without-stripe">
          {data && (
            <Card>
              <CardHeader>
                <CardTitle>Students Missing Stripe ID</CardTitle>
                <CardDescription>
                  Students whose payers don't have a Stripe customer ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.payerGroups
                  .filter((group) => !group.payer.hasStripe)
                  .map((group) => (
                    <div
                      key={group.payer.id}
                      className="mb-8 overflow-hidden rounded-lg border"
                    >
                      <div className="flex items-center justify-between bg-muted p-4">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold">
                            {group.payer.name}
                            <Badge
                              variant="outline"
                              className="bg-red-700 text-white"
                            >
                              <AlertCircle className="mr-1 h-3 w-3" />
                              No Stripe
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {group.payer.email} • {group.payer.phone} •{' '}
                            {group.payer.relationship ||
                              'No relationship specified'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {group.studentCount} student
                            {group.studentCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Batch</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.students.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">
                                {student.name}
                              </TableCell>
                              <TableCell>{student.email || '-'}</TableCell>
                              <TableCell>{student.phone || '-'}</TableCell>
                              <TableCell>{student.status}</TableCell>
                              <TableCell>
                                {student.batch ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-700 text-white"
                                  >
                                    {student.batch.name}
                                  </Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
