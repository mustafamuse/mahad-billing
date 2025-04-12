import { Suspense } from 'react'

import { Metadata } from 'next'

import { Separator } from '@/components/ui/separator'

import { Providers } from '../providers'
import { BatchManagement } from './components/batch-management'
import { BatchesTable } from './components/batches-table'
import { DuplicateStudentsClient } from './components/duplicate-students-client'
import { BatchErrorBoundary } from './components/error-boundary'

function Loading() {
  return <div className="p-4 text-muted-foreground">Loading...</div>
}

export const metadata: Metadata = {
  title: 'Batch Management',
  description: 'Manage student batches and assignments',
}

export default function BatchesPage() {
  return (
    <Providers>
      <main className="container mx-auto space-y-8 p-8">
        <BatchErrorBoundary>
          <Suspense fallback={<Loading />}>
            <DuplicateStudentsClient />
          </Suspense>
        </BatchErrorBoundary>

        <BatchErrorBoundary>
          <Suspense fallback={<Loading />}>
            <BatchManagement />
          </Suspense>
        </BatchErrorBoundary>

        <Separator className="my-8" />

        <BatchErrorBoundary>
          <Suspense fallback={<Loading />}>
            <BatchesTable />
          </Suspense>
        </BatchErrorBoundary>
      </main>
    </Providers>
  )
}
