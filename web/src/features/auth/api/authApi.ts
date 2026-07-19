import { useMutation } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { LoginResponse } from '@/shared/api/types'

// username пуст → бэкенд принимает break-glass вход по паролю (роль admin)
export function useLogin() {
  return useMutation({
    mutationFn: (creds: { username: string; password: string }) =>
      api.post<LoginResponse>('/api/v1/auth/login', creds),
  })
}
