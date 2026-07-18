import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { Person } from '@/shared/api/types'

export function usePersons() {
  return useQuery({ queryKey: ['persons'], queryFn: () => api.get<Person[]>('/api/v1/persons') })
}

export function useCreatePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; watch: boolean; track_id: string; note?: string }) =>
      api.post('/api/v1/persons', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['persons'] }),
  })
}

export function usePatchPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/v1/persons/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['persons'] }),
  })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/persons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['persons'] }),
  })
}
