'use client'

import { useState } from 'react'

import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { DuplicateStudents } from './duplicate-students'

export function DuplicateStudentsSection() {
  const [showDuplicates, setShowDuplicates] = useState(false)

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <div>
            <h2 className="text-lg font-semibold">Duplicate Student Records</h2>
            <p className="text-sm text-muted-foreground">
              Review and manage duplicate student entries
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDuplicates(!showDuplicates)}
        >
          {showDuplicates ? (
            <>
              <span className="mr-2">Hide</span>
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              <span className="mr-2">Show</span>
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {showDuplicates && (
        <div className="mt-4 rounded-md border bg-amber-50/50 p-4">
          <DuplicateStudents />
        </div>
      )}
    </div>
  )
}
