'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function DashboardHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" /> {/* Title */}
        <Skeleton className="h-4 w-[350px]" /> {/* Description */}
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-[120px]" /> {/* Payment monitoring */}
        <Skeleton className="h-9 w-[120px]" /> {/* Export button */}
        <Skeleton className="h-9 w-[100px]" /> {/* Add student */}
      </div>
    </div>
  )
}
