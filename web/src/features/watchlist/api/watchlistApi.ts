import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { Person, PersonCreate, PersonCategoryRow, PersonFolder } from '@/shared/api/types'

export function usePersons(category?: string, folderId?: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (folderId) params.set('folder_id', folderId)
  const q = params.toString() ? `?${params}` : ''
  return useQuery({
    queryKey: ['persons', category ?? 'all', folderId ?? 'any'],
    queryFn: () => api.get<Person[]>(`/api/v1/persons${q}`),
  })
}

export interface EnrollInput {
  name: string
  category: string
  position: string
  note: string
  watch: boolean
  folderId: string | null
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
      if (input.folderId) form.append('folder_id', input.folderId)
      input.files.forEach((f) => form.append('files', f))
      return api.postForm('/api/v1/persons/enroll', form)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['persons'] })
      void qc.invalidateQueries({ queryKey: ['person-folders'] })
    },
  })
}

// --- папки-дерево людей (напр. Школа → 5-е классы → 5-А) --------------------

export function usePersonFolders() {
  return useQuery({
    queryKey: ['person-folders'],
    queryFn: () => api.get<PersonFolder[]>('/api/v1/person-folders'),
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; parent_id?: string | null }) =>
      api.post('/api/v1/person-folders', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['person-folders'] }),
  })
}

export function usePatchFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/v1/person-folders/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['person-folders'] }),
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/person-folders/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['person-folders'] })
      void qc.invalidateQueries({ queryKey: ['persons'] })
    },
  })
}

// --- редактируемые категории людей (per-site) ------------------------------

export function usePersonCategories() {
  return useQuery({
    queryKey: ['person-categories'],
    queryFn: () => api.get<PersonCategoryRow[]>('/api/v1/person-categories'),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post('/api/v1/person-categories', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['person-categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/person-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['person-categories'] }),
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

// --- фото человека: эталон лица строится усреднением по всем фото, поэтому
// добавление/удаление снимков напрямую влияет на точность распознавания.

export interface PersonPhoto {
  id: string
  url: string
}

export function usePersonPhotos(personId: string | null) {
  return useQuery({
    queryKey: ['person-photos', personId],
    queryFn: () => api.get<PersonPhoto[]>(`/api/v1/persons/${personId}/photos`),
    enabled: !!personId,
  })
}

export function useAddPersonPhotos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => {
      const form = new FormData()
      files.forEach((f) => form.append('files', f))
      return api.postForm<{ added: number }>(`/api/v1/persons/${id}/photos`, form)
    },
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: ['person-photos', v.id] })
      void qc.invalidateQueries({ queryKey: ['persons'] })
    },
  })
}

export function useDeletePersonPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ photoId }: { photoId: string; personId: string }) =>
      api.del(`/api/v1/persons/photos/${photoId}`),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: ['person-photos', v.personId] })
      void qc.invalidateQueries({ queryKey: ['persons'] })
    },
  })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/persons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['persons'] }),
  })
}
