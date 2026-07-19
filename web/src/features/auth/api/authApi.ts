import { useMutation } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { LoginResponse } from '@/shared/api/types'

// username пуст → бэкенд принимает break-glass вход по паролю (роль admin).
// code — TOTP второго фактора; если 2FA включена и code пуст, ответ вернёт
// mfa_required=true и клиент повторит логин с кодом.
export function useLogin() {
  return useMutation({
    mutationFn: (creds: { username: string; password: string; code?: string }) =>
      api.post<LoginResponse>('/api/v1/auth/login', creds),
  })
}
