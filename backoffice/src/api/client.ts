/**
 * Тонкая типизированная обёртка над API Pragmata. Каждый запрос несёт
 * Authorization: Bearer <token>; каждый не-2xx нормализуется в ApiError с
 * detail из бэкенда. 401 → чистим токен (сессия истекла).
 */
import { clearToken, getToken } from '@/auth/tokenStore'

export const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8088'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit, isForm = false): Promise<T> {
  const headers: Record<string, string> = isForm ? {} : { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    clearToken()
    throw new ApiError(401, 'сессия истекла')
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* не-JSON тело */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// --- логин (тот же /auth/login, TOTP-2FA) -----------------------------------

export type LoginResult = { access_token: string; mfa_required: boolean }

export function login(username: string, password: string, code?: string) {
  return api.post<LoginResult>('/api/v1/auth/login', {
    username,
    password,
    code: code || undefined,
  })
}
