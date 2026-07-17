import { api } from '@/shared/api/client'

export function login(password: string) {
  return api.post<{ access_token: string }>('/api/v1/auth/login', { password })
}
