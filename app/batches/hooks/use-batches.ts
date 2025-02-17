'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getAllBatches } from '@/lib/actions/batch-actions'

export function useBatches() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const data = await getAllBatches()
      console.log('📊 Batches loaded:', {
        count: data.length,
        batches: data.map((b) => ({
          name: b.name,
          students: b.studentCount,
        })),
      })
      return data
    },
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false,
  })

  const invalidateBatches = () => {
    return queryClient.invalidateQueries({ queryKey: ['batches'] })
  }

  return { ...query, invalidateBatches }
}
