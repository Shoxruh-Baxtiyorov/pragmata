import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { EventsResponse } from '@/shared/api/types'

export const EVENTS_PER_PAGE = 25

export interface EventFilters {
  hours: number
  camera_id?: string
  type?: string
  severity?: string
}

// Лента событий: настоящая постраничность (page → offset). keepPreviousData —
// чтобы при переключении страниц список не мигал пустотой. Поллинг POLL.events.
export function useEvents(filters: EventFilters, page: number) {
  return useQuery({
    queryKey: ['events', filters, page],
    queryFn: () => {
      const p = new URLSearchParams({
        hours: String(filters.hours),
        limit: String(EVENTS_PER_PAGE),
        offset: String((page - 1) * EVENTS_PER_PAGE),
      })
      if (filters.camera_id) p.set('camera_id', filters.camera_id)
      if (filters.type) p.set('type', filters.type)
      if (filters.severity) p.set('severity', filters.severity)
      return api.get<EventsResponse>(`/api/v1/events?${p.toString()}`)
    },
    placeholderData: keepPreviousData,
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
