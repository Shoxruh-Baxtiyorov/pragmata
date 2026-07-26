import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

// --- типы ответов -----------------------------------------------------------

export interface Overview {
  users_total: number
  users_active: number
  admins: number
  users_with_2fa: number
  users_locked: number
  cameras_total: number
  cameras_enabled: number
  persons_total: number
  events_today: number
  llm_model: string
  llm_enabled: boolean
}

export interface SiteRow {
  id: number
  name: string
  tariff: string
  cameras: number
}

export interface SiteSettings {
  name: string
  timezone: string
  working_hours: { days: string[]; open: string; close: string } | null
  digest_time: string
  tariff: string
  retention_info_days: number
  retention_alert_days: number
  media_quota_gb: number
}

export interface UserRow {
  id: string
  username: string
  role: string
  is_active: boolean
  full_name: string | null
  email: string | null
  last_login_at: string | null
  locked: boolean
}

export interface CameraRow {
  id: string
  name: string
  online: boolean
  enabled: boolean
  snapshot_url: string | null
  zones: { id: string | null; name: string; type: string }[]
}

export interface PersonRow {
  id: string
  name: string
  category: string
  position: string | null
  note: string | null
  watch: boolean
  photo_count: number
}

export interface AuditRow {
  id: string
  ts: string
  actor: string
  method: string
  path: string
  status_code: number
  ip: string | null
}

// --- запросы ----------------------------------------------------------------

export const useOverview = () =>
  useQuery({ queryKey: ['overview'], queryFn: () => api.get<Overview>('/api/v1/backoffice/overview') })

export const useSites = () =>
  useQuery({ queryKey: ['sites'], queryFn: () => api.get<SiteRow[]>('/api/v1/backoffice/sites') })

export const useSettings = () =>
  useQuery({
    queryKey: ['bo-settings'],
    queryFn: () => api.get<SiteSettings>('/api/v1/backoffice/settings'),
  })

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: () => api.get<UserRow[]>('/api/v1/users') })

export const useCameras = () =>
  useQuery({
    queryKey: ['cameras'],
    queryFn: () => api.get<CameraRow[]>('/api/v1/cameras?all=true'),
  })

export const usePersons = () =>
  useQuery({ queryKey: ['persons'], queryFn: () => api.get<PersonRow[]>('/api/v1/persons') })

export const useAudit = (onlyWrites: boolean) =>
  useQuery({
    queryKey: ['audit', onlyWrites],
    queryFn: () => api.get<AuditRow[]>(`/api/v1/backoffice/audit?limit=200&only_writes=${onlyWrites}`),
  })

// --- мутации ----------------------------------------------------------------

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { username: string; password: string; role: string; full_name?: string | null }) =>
      api.post('/api/v1/users', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function usePatchUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      api.patch(`/api/v1/users/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUserAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, password }: { id: string; action: '2fa/reset' | 'unlock' | 'password'; password?: string }) =>
      action === 'password'
        ? api.post(`/api/v1/users/${id}/password`, { new_password: password })
        : api.post(`/api/v1/backoffice/users/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function usePatchSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<SiteSettings>) =>
      api.patch<SiteSettings>('/api/v1/backoffice/settings', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bo-settings'] }),
  })
}

export function useRunRetention() {
  return useMutation({
    mutationFn: () =>
      api.post<{ events: number; freed_mb: number; orphans: number }>('/api/v1/backoffice/retention/run'),
  })
}
