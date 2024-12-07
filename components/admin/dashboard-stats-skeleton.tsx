'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-[100px]" /> {/* Title */}
              <Skeleton className="h-5 w-5 rounded-full" /> {/* Icon */}
            </div>
            {/* Content */}
            <div>
              <Skeleton className="h-8 w-[120px]" /> {/* Main value */}
              <Skeleton className="mt-2 h-4 w-[140px]" /> {/* Sub text */}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
