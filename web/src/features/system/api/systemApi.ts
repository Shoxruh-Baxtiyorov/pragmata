import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { SystemInfo } from '@/shared/api/types'

export function useSystem() {
  return useQuery({
    queryKey: ['system'],
    queryFn: () => api.get<SystemInfo>('/api/v1/system'),
    refetchInterval: POLL.stats,
  })
}
