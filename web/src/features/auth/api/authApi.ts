import { useMutation } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { LoginResponse } from '@/shared/api/types'

export function useLogin() {
  return useMutation({
    mutationFn: (password: string) =>
      api.post<LoginResponse>('/api/v1/auth/login', { password }),
  })
}
