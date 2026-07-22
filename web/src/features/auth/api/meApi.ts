import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'

export interface Me {
  sub: string
  username: string
  role: string
  /** Доступ к настройке объекта: роль admin И имя в allowlist BACKOFFICE_USERS. */
  backoffice: boolean
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/api/v1/me'),
    staleTime: 5 * 60_000,
  })
}

/**
 * Может ли текущий пользователь менять конфигурацию (камеры, зоны, люди).
 * Фронт обязан спрашивать это у сервера: allowlist бэкофиса ему не виден,
 * иначе кнопки настройки показываются тем, кто гарантированно получит 403.
 */
export function useCanManage(): boolean {
  return useMe().data?.backoffice ?? false
}
