import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { TotpSetup, TotpStatus } from '@/shared/api/types'

export function useTotpStatus() {
  return useQuery({ queryKey: ['2fa'], queryFn: () => api.get<TotpStatus>('/api/v1/me/2fa') })
}

export function useTotpSetup() {
  return useMutation({
    mutationFn: () => api.post<TotpSetup>('/api/v1/me/2fa/setup', {}),
  })
}

export function useEnableTotp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => api.post('/api/v1/me/2fa/enable', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa'] }),
  })
}

export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: (newPassword: string) =>
      api.post('/api/v1/me/password', { new_password: newPassword }),
  })
}

export function useDisableTotp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => api.post('/api/v1/me/2fa/disable', { code }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['2fa'] }),
  })
}
