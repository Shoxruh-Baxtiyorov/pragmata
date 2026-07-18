import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { Digest, Stats } from '@/shared/api/types'

export function useStats(hours: number) {
  return useQuery({
    queryKey: ['stats', hours],
    queryFn: () => api.get<Stats>(`/api/v1/stats?hours=${hours}`),
    refetchInterval: POLL.stats,
  })
}

export function useDigest(hours: number, lang: 'ru' | 'uz' | 'en') {
  return useQuery({
    queryKey: ['digest', hours, lang],
    queryFn: () => api.get<Digest>(`/api/v1/digest?hours=${hours}&lang=${lang}`),
  })
}
