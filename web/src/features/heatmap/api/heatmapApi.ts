import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { POLL } from '@/shared/lib/format'
import type { Camera } from '@/shared/api/types'

// тот же ключ, что у живой стены — делим кэш камер
export function useHeatmapCameras() {
  return useQuery({
    queryKey: ['cameras'],
    queryFn: () => api.get<Camera[]>('/api/v1/cameras'),
    refetchInterval: POLL.snapshots,
  })
}

export interface Heatmap {
  w: number
  h: number
  grid: number[][]
  max: number
  snapshot_url: string | null
}

export function useHeatmap(cameraId: string | null) {
  return useQuery({
    queryKey: ['heatmap', cameraId],
    queryFn: () => api.get<Heatmap>(`/api/v1/cameras/${cameraId}/heatmap`),
    enabled: Boolean(cameraId),
    refetchInterval: 15000, // карта копится медленно — обновляем не часто
  })
}
