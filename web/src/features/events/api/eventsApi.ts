import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { EventsPage } from '@/shared/api/types'

export interface EventFilters {
  hours: number
  camera_id?: string
  type?: string
  severity?: string
}

const PAGE = 30

export function useEvents(filters: EventFilters) {
  return useInfiniteQuery({
    queryKey: ['events', filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({
        hours: String(filters.hours),
        limit: String(PAGE),
        offset: String(pageParam),
      })
      if (filters.camera_id) p.set('camera_id', filters.camera_id)
      if (filters.type) p.set('type', filters.type)
      if (filters.severity) p.set('severity', filters.severity)
      return api.get<EventsPage>(`/api/v1/events?${p.toString()}`)
    },
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, pg) => n + pg.items.length, 0)
      return loaded < last.total ? loaded : undefined
    },
    refetchInterval: POLL.events,
  })
}

export function useFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, verdict }: { id: string; verdict: 'false_positive' | 'confirmed' }) =>
      api.post(`/api/v1/events/${id}/feedback`, { verdict }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
