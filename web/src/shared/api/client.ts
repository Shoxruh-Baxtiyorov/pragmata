const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8088'
const TOKEN_KEY = 'soqchi_token'

export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Мост к роутеру: 401 → logout + redirect (подключается в AppProviders)
let onUnauthorized: (() => void) | undefined
export function setOnUnauthorized(fn: () => void): void {
  onUnauthorized = fn
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = auth.get()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    auth.clear()
    onUnauthorized?.()
    throw new ApiError(401, 'unauthorized')
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* не-JSON тело — оставляем statusText */
    }
    throw new ApiError(res.status, detail)
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  url: (path: string) => `${BASE}${path}`,
}

// Медиа-эндпоинты требуют Bearer — обычный <img src> не сработает
export async function fetchAuthedBlob(path: string): Promise<string> {
  const token = auth.get()
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return URL.createObjectURL(await res.blob())
}
