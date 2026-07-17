import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { Camera } from '@/shared/api/types'

export function useCameras() {
  return useQuery({
    queryKey: ['cameras'],
    queryFn: () => api.get<Camera[]>('/api/v1/cameras'),
    refetchInterval: POLL.snapshots,
  })
}
