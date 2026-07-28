import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'

export interface WorkingHours {
  days: string[]
  open: string
  close: string
}

export interface OrgHours {
  timezone: string
  working_hours: WorkingHours | null
}

export function useOrgHours() {
  return useQuery({
    queryKey: ['org-hours'],
    queryFn: () => api.get<OrgHours>('/api/v1/settings'),
  })
}

export function useSaveOrgHours() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      timezone?: string
      working_hours?: Record<string, unknown> | null
    }) => api.patch<OrgHours>('/api/v1/settings', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-hours'] }),
  })
}
