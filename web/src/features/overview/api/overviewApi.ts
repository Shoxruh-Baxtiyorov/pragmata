import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { Overview } from '@/shared/api/types'

export function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: () => api.get<Overview>('/api/v1/overview'),
    refetchInterval: POLL.stats,
  })
}
