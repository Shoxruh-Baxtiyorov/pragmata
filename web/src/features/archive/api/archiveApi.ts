import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { ArchiveJob, Camera, EventsResponse } from '@/shared/api/types'

export function useCamerasList() {
  return useQuery({ queryKey: ['cameras'], queryFn: () => api.get<Camera[]>('/api/v1/cameras') })
}

// Пока идёт хоть одна задача — опрашиваем чаще (прогресс), иначе реже
export function useArchiveJobs() {
  return useQuery({
    queryKey: ['archiveJobs'],
    queryFn: () => api.get<ArchiveJob[]>('/api/v1/archive/jobs'),
    refetchInterval: (q) =>
      (q.state.data ?? []).some((j) => j.status === 'running' || j.status === 'pending')
        ? 1500
        : 8000,
  })
}

export function useAnalyzeArchive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      file?: File | null
      url?: string
      recorded_at: string
      camera_id: string
    }) => {
      const form = new FormData()
      form.append('recorded_at', input.recorded_at)
      form.append('camera_id', input.camera_id)
      if (input.url) form.append('url', input.url)
      else if (input.file) form.append('file', input.file)
      return api.postForm('/api/v1/archive/analyze', form)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archiveJobs'] }),
  })
}

// События, найденные в архиве данной камеры (за широкое окно 30 дней)
/** Разбор прямо с регистратора: playback-ссылку собирает бэкенд из адреса камеры. */
export function useAnalyzeFromNvr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { camera_id: string; from_time: string; to_time: string }) =>
      api.post<{ id: string }>('/api/v1/archive/nvr', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['archive-jobs'] }),
  })
}

export function useArchiveEvents(cameraId: string | null) {
  return useQuery({
    queryKey: ['archiveEvents', cameraId],
    queryFn: () =>
      api.get<EventsResponse>(
        `/api/v1/events?source=archive&hours=720&limit=100&camera_id=${cameraId}`,
      ),
    enabled: !!cameraId,
  })
}
