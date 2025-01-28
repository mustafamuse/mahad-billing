'use client'

import { useEffect, useMemo } from 'react'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

interface DashboardFiltersProps {
  onSearchChange?: (search: string) => void
  onStatusChange?: (status: string) => void
  onDiscountTypeChange?: (type: string) => void
}

const statusConfig = {
  all: { label: 'All Statuses', color: 'bg-gray-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  not_enrolled: { label: 'Not Enrolled', color: 'bg-gray-500' },
  past_due: { label: 'Past Due', color: 'bg-yellow-500' },
  unpaid: { label: 'Unpaid', color: 'bg-red-500' },
  canceled: { label: 'Canceled', color: 'bg-red-500' },
} as const

const discountConfig = {
  all: { label: 'All Discounts' },
  'Family Discount': { label: 'Family Discount' },
  None: { label: 'No Discount' },
  Other: { label: 'Other Discount' },
} as const

export function DashboardFilters({
  onSearchChange,
  onStatusChange,
  onDiscountTypeChange,
}: DashboardFiltersProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? 'active'
  const discountType = searchParams.get('discountType') ?? 'all'

  const debouncedSearch = useDebounce(search, 300)

  const createQueryString = useMemo(
    () => (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (value: string) => {
    replace(`${pathname}?${createQueryString('search', value)}`)
  }

  const handleStatus = (value: string) => {
    replace(`${pathname}?${createQueryString('status', value)}`)
  }

  const handleDiscountType = (value: string) => {
    replace(`${pathname}?${createQueryString('discountType', value)}`)
  }

  useEffect(() => {
    onSearchChange?.(debouncedSearch)
  }, [debouncedSearch, onSearchChange])

  useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])

  useEffect(() => {
    onDiscountTypeChange?.(discountType)
  }, [discountType, onDiscountTypeChange])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-[350px] flex-grow">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 w-full pl-10 pr-4"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={status} onValueChange={handleStatus}>
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue>
              {statusConfig[status as keyof typeof statusConfig]?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem
                key={key}
                value={key}
                className="flex items-center gap-2"
              >
                <span className={cn('h-2 w-2 rounded-full', config.color)} />
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={discountType} onValueChange={handleDiscountType}>
          <SelectTrigger className="h-10 w-[180px]">
            <SelectValue>
              {
                discountConfig[discountType as keyof typeof discountConfig]
                  ?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(discountConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
