// Клиент бэкофиса. Отдельное приложение → свой ключ токена, свой логин.
// Все /backoffice/* эндпоинты server-side закрыты require_backoffice (allowlist).

const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8088'
const TOKEN_KEY = 'pragmata_bo_token'
const NAME_KEY = 'pragmata_bo_username'

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  username: () => localStorage.getItem(NAME_KEY) ?? '',
  set: (token: string, username: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(NAME_KEY, username)
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(NAME_KEY)
  },
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
  const token = session.token()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    session.clear()
    throw new ApiError(401, 'unauthorized')
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
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}

// --- логин (тот же /auth/login, поддержка TOTP-2FA) -------------------------

export type LoginResult = { access_token: string; mfa_required: boolean }

export function login(username: string, password: string, code?: string) {
  return api.post<LoginResult>('/api/v1/auth/login', {
    username,
    password,
    code: code || undefined,
  })
}

// --- типы ответов бэкофиса --------------------------------------------------

export type Overview = {
  users_total: number
  users_active: number
  admins: number
  users_with_2fa: number
  users_locked: number
  cameras_total: number
  cameras_enabled: number
  persons_total: number
  events_today: number
  llm_model: string
  llm_enabled: boolean
}

export type WorkingHours = { days: string[]; open: string; close: string }

export type SiteSettings = {
  name: string
  timezone: string
  working_hours: WorkingHours | null
  digest_time: string
}

export type UserOut = {
  id: string
  username: string
  role: string
  is_active: boolean
  full_name: string | null
  email: string | null
  last_login_at: string | null
  locked: boolean
}
