// Тонкий fetch-клиент с Bearer-токеном и 401-интерсептором.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8088'
const TOKEN_KEY = 'soqchi_token'

export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

/** Вызывается интерсептором при 401 — навигацию вешает провайдер. */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.get()
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (res.status === 401) {
    auth.clear()
    onUnauthorized?.()
    throw new ApiError(401, 'Не авторизован')
  }
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d) => d?.detail as string)
      .catch(() => null)
    throw new ApiError(res.status, detail ?? `Ошибка ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  url: (path: string) => `${API_URL}${path}`,
}

/** Медиа требуют Bearer → грузим blob и отдаём objectURL (см. useAuthedMedia). */
export async function fetchAuthedBlob(path: string): Promise<string> {
  const token = auth.get()
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status, `media ${res.status}`)
  return URL.createObjectURL(await res.blob())
}
