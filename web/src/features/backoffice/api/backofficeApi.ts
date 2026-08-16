import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'

export interface SiteRow {
  id: number
  name: string
  tariff: string
  cameras: number
}

export interface PlanEntitlements {
  modules?: string[]
  features?: string[]
  person_categories?: string[]
  limits?: Record<string, number>
}

export interface PlanRow {
  key: string
  name: string
  price_note: string
  retention_info_days: number
  retention_alert_days: number
  active: boolean
  features: string[]
  entitlements: PlanEntitlements
}

// поля, которые можно править/задать при создании подписки
export interface PlanPatch {
  name?: string
  price_note?: string
  retention_info_days?: number
  retention_alert_days?: number
  active?: boolean
  entitlements?: PlanEntitlements
}

export function useBoSites() {
  return useQuery({
    queryKey: ['bo-sites'],
    queryFn: () => api.get<SiteRow[]>('/api/v1/backoffice/sites'),
    retry: false,
  })
}

export function useBoPlans() {
  return useQuery({
    queryKey: ['bo-plans'],
    queryFn: () => api.get<PlanRow[]>('/api/v1/backoffice/plans'),
    retry: false,
  })
}

export function useAssignPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tariff }: { id: number; tariff: string }) =>
      api.patch(`/api/v1/backoffice/sites/${id}`, { tariff }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bo-sites'] })
      qc.invalidateQueries({ queryKey: ['sites'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

// правка существующей подписки (мета и/или права)
export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, patch }: { key: string; patch: PlanPatch }) =>
      api.patch(`/api/v1/backoffice/plans/${key}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bo-plans'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

// создание новой подписки (key — латиница/цифры, неизменяемый идентификатор)
export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, body }: { key: string; body: PlanPatch }) =>
      api.post(`/api/v1/backoffice/plans/${key}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bo-plans'] }),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (key: string) => api.del(`/api/v1/backoffice/plans/${key}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bo-plans'] }),
  })
}
