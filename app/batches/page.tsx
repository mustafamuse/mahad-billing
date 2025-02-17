import { Suspense } from 'react'

import dynamic from 'next/dynamic'

import { Metadata } from 'next'

import { Separator } from '@/components/ui/separator'

import { Providers } from '../providers'
import { BatchManagement } from './components/batch-management'
import { BatchesTable } from './components/batches-table'
import { BatchErrorBoundary } from './components/error-boundary'

// Import DuplicateStudentsSection with ssr disabled to prevent hydration errors
const DuplicateStudentsSection = dynamic(
  () =>
    import('./components/duplicate-students-section').then(
      (mod) => mod.DuplicateStudentsSection
    ),
  { ssr: false }
)

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
            <DuplicateStudentsSection />
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
