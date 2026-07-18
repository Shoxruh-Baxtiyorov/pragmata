import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { Camera, CameraInput, ZoneInput } from '@/shared/api/types'

export function useManageCameras() {
  return useQuery({
    queryKey: ['cameras', 'all'],
    queryFn: () => api.get<Camera[]>('/api/v1/cameras?all=true'),
    refetchInterval: 5000,
  })
}

// Мутации трогают набор камер (и вложенные зоны) → инвалидируем весь ключ 'cameras'
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['cameras'] })
}

export function useCreateCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: CameraInput) => api.post('/api/v1/cameras', c),
    onSuccess: () => invalidate(qc),
  })
}

export function usePatchCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/v1/cameras/${id}`, patch),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteCamera() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/cameras/${id}`),
    onSuccess: () => invalidate(qc),
  })
}

export function useAddZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cameraId, zone }: { cameraId: string; zone: ZoneInput }) =>
      api.post(`/api/v1/cameras/${cameraId}/zones`, zone),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (zoneId: string) => api.del(`/api/v1/zones/${zoneId}`),
    onSuccess: () => invalidate(qc),
  })
}
