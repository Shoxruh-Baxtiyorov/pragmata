import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { Turnstile } from '@/shared/api/types'

const KEY = ['turnstiles']

export function useTurnstiles() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<Turnstile[]>('/api/v1/turnstiles'),
  })
}

export interface TurnstileInput {
  name: string
  camera_id?: string | null
  mode?: string
  connector?: string
  config?: Record<string, unknown>
  enabled?: boolean
}

export function useCreateTurnstile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (t: TurnstileInput) => api.post('/api/v1/turnstiles', t),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTurnstile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/turnstiles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useOpenTurnstile() {
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: boolean }>(`/api/v1/turnstiles/${id}/open`, {}),
  })
}
