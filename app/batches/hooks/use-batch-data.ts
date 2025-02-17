'use client'

import { useQuery } from '@tanstack/react-query'

import { getBatchData } from '@/lib/actions/get-batch-data'

export function useBatchData() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const data = await getBatchData()
      // Only log once when data is fetched
      console.log('✅ Students loaded:', {
        count: data.length,
      })
      return data
    },
    staleTime: Infinity, // Keep data fresh indefinitely
    gcTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  })
}
