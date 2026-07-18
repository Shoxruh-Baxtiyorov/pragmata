import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { EventsResponse } from '@/shared/api/types'

const LIMIT = 30

export interface EventFilters {
  hours: number
  camera_id?: string
  type?: string
  severity?: string
}

// Лента событий: постранично (offset), докрутка через loaded<total, поллинг POLL.events
export function useEvents(filters: EventFilters) {
  return useInfiniteQuery({
    queryKey: ['events', filters],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({
        hours: String(filters.hours),
        limit: String(LIMIT),
        offset: String(pageParam),
      })
      if (filters.camera_id) p.set('camera_id', filters.camera_id)
      if (filters.type) p.set('type', filters.type)
      if (filters.severity) p.set('severity', filters.severity)
      return api.get<EventsResponse>(`/api/v1/events?${p.toString()}`)
    },
    initialPageParam: 0,
    getNextPageParam: (_last, pages) => {
      const loaded = pages.reduce((n, pg) => n + pg.items.length, 0)
      const total = pages[0]?.total ?? 0
      return loaded < total ? loaded : undefined
    },
    refetchInterval: POLL.events,
  })
}

// Оценка события оператором — инвалидирует ленту, чтобы отметка подтянулась
export function useFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, verdict }: { id: string; verdict: 'false_positive' | 'confirmed' }) =>
      api.post(`/api/v1/events/${id}/feedback`, { verdict }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
