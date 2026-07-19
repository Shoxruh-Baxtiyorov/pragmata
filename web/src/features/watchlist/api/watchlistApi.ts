import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { Person, PersonCreate } from '@/shared/api/types'

export function usePersons(category?: string) {
  const q = category ? `?category=${category}` : ''
  return useQuery({
    queryKey: ['persons', category ?? 'all'],
    queryFn: () => api.get<Person[]>(`/api/v1/persons${q}`),
  })
}

export interface EnrollInput {
  name: string
  category: string
  position: string
  note: string
  watch: boolean
  files: File[]
}

export function useEnrollPerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EnrollInput) => {
      const form = new FormData()
      form.append('name', input.name)
      form.append('category', input.category)
      form.append('position', input.position)
      form.append('note', input.note)
      form.append('watch', String(input.watch))
      input.files.forEach((f) => form.append('files', f))
      return api.postForm('/api/v1/persons/enroll', form)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['persons'] }),
  })
}

export function useCreatePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PersonCreate) => api.post('/api/v1/persons', body),
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
