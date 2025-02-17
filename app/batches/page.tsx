import { Suspense } from 'react'

import { Metadata } from 'next'

import { Providers } from '../providers'
import { BatchesTable } from './components/batches-table'
import { DuplicateStudents } from './components/duplicate-students'
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
            <DuplicateStudents />
          </Suspense>
        </BatchErrorBoundary>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground">
            Manage student batches and view registrations
          </p>
        </div>

        <BatchErrorBoundary>
          <Suspense fallback={<Loading />}>
            <BatchesTable />
          </Suspense>
        </BatchErrorBoundary>
      </main>
    </Providers>
  )
}
