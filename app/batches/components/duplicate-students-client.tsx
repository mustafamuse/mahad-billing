'use client'

import dynamic from 'next/dynamic'

// Import DuplicateStudentsSection with ssr disabled to prevent hydration errors
const DuplicateStudentsSection = dynamic(
  () =>
    import('./duplicate-students-section').then(
      (mod) => mod.DuplicateStudentsSection
    ),
  { ssr: false }
)

export function DuplicateStudentsClient() {
  return <DuplicateStudentsSection />
}
