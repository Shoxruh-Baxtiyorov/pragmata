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
  active: boolean
  features: string[]
  entitlements: PlanEntitlements
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

export function useSavePlanEntitlements() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ key, entitlements }: { key: string; entitlements: PlanEntitlements }) =>
      api.patch(`/api/v1/backoffice/plans/${key}`, { entitlements }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bo-plans'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
