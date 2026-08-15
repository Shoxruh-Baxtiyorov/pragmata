import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'

/** Права подписки площадки — фронт по ним гейтит навигацию и каталог модулей. */
export interface Entitlements {
  /** платформа/полный доступ — ничего не ограничиваем */
  all: boolean
  tariff: string | null
  modules: string[]
  features: string[]
  person_categories: string[]
  limits: Record<string, number>
}

export interface Me {
  sub: string
  username: string
  role: string
  site_id: number | null
  /** Доступ к настройке объекта: роль admin И имя в allowlist BACKOFFICE_USERS. */
  backoffice: boolean
  entitlements: Entitlements
}

// пока /me грузится — разрешаем всё (не мигаем скрытием навигации; сегодня у всех полный доступ)
const FULL: Entitlements = {
  all: true,
  tariff: null,
  modules: [],
  features: [],
  person_categories: [],
  limits: {},
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/api/v1/me'),
    staleTime: 5 * 60_000,
  })
}

/** Права текущей площадки (или полный доступ, пока /me не загрузился). */
export function useEntitlements(): Entitlements {
  return useMe().data?.entitlements ?? FULL
}

/** Открыт ли раздел приложения (навигация) тарифом. */
export function useHasFeature(key: string): boolean {
  const e = useEntitlements()
  return e.all || e.features.includes(key)
}

/**
 * Может ли текущий пользователь менять конфигурацию (камеры, зоны, люди).
 * Фронт обязан спрашивать это у сервера: allowlist бэкофиса ему не виден,
 * иначе кнопки настройки показываются тем, кто гарантированно получит 403.
 */
export function useCanManage(): boolean {
  return useMe().data?.backoffice ?? false
}
