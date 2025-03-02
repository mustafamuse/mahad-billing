import { Suspense } from 'react'

import { AlertTriangle } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { prisma } from '@/lib/db'
import { findUnlinkedSubscriptions } from '@/lib/queries/stripe-reconciliation'

import { SubscriptionsTable } from './components/subscriptions-table'
import { SubscriptionsTableSkeleton } from './components/subscriptions-table/loading'
import { UnmatchedSubscriptions } from './components/unmatched-subscriptions'

export const metadata = {
  title: 'Student Subscriptions',
  description: 'Manage and view all student subscription statuses',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0


export default async function SubscriptionsPage() {
  try {
    const [unlinkedSubscriptions, students, batches] = await Promise.all([
      findUnlinkedSubscriptions(),
      prisma.student.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.batch.findMany({
        where: {
          students: {
            some: {
              payer: {
                isNot: null,
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ])

    return (
      <div className="container space-y-8 py-8">
        <PageHeader
          heading="Student Subscriptions"
          description="View and manage all student subscription statuses"
        />

        {/* Show unmatched subscriptions at the top */}
        <UnmatchedSubscriptions
          subscriptions={unlinkedSubscriptions.filter((sub) => sub.isUnmatched)}
          students={students}
        />

        {/* Show all student subscriptions from the database */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">Student Subscriptions</h2>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">All Students</TabsTrigger>
              {batches.map((batch) => (
                <TabsTrigger key={batch.id} value={batch.id}>
                  {batch.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <Suspense fallback={<SubscriptionsTableSkeleton />}>
                <SubscriptionsTable batchId={null} />
              </Suspense>
            </TabsContent>

            {batches.map((batch) => (
              <TabsContent key={batch.id} value={batch.id}>
                <Suspense fallback={<SubscriptionsTableSkeleton />}>
                  <SubscriptionsTable batchId={batch.id} />
                </Suspense>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading subscriptions:', error)
    return (
      <div className="container space-y-8 py-8">
        <PageHeader
          heading="Student Subscriptions"
          description="View and manage all student subscription statuses"
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load subscriptions. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
}
