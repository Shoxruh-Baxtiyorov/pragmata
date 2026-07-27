import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { AnalyticsCatalog } from '@/shared/api/types'

export function useAnalyticsCatalog() {
  return useQuery({
    queryKey: ['analytics-catalog'],
    queryFn: () => api.get<AnalyticsCatalog>('/api/v1/analytics/modules'),
    staleTime: 5 * 60 * 1000, // каталог статичен
  })
}

export interface SetModuleArgs {
  scope: 'camera' | 'zone'
  targetId: string
  moduleKey: string
  enabled: boolean
  params: Record<string, unknown>
}

export function useSetModule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scope, targetId, moduleKey, enabled, params }: SetModuleArgs) => {
      const base = scope === 'camera' ? 'cameras' : 'zones'
      return api.put(`/api/v1/${base}/${targetId}/analytics/${moduleKey}`, { enabled, params })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cameras'] }),
  })
}
