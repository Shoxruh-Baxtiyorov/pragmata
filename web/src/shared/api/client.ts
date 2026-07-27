// Пусто = тот же origin: запросы идут на /api/... текущего хоста. Так работает
// и локально (Vite проксирует /api → :8088), и через один ngrok-тоннель на :5175.
// Абсолютный адрес можно навязать через VITE_API_URL, если API на другом хосте.
const BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'pragmata_token'
const ROLE_KEY = 'pragmata_role'
const NAME_KEY = 'pragmata_username'

export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY),
  role: () => localStorage.getItem(ROLE_KEY) ?? '',
  username: () => localStorage.getItem(NAME_KEY) ?? '',
  set: (token: string, role = 'user', username = '') => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ROLE_KEY, role)
    localStorage.setItem(NAME_KEY, username)
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(NAME_KEY)
  },
}

const SITE_KEY = 'pragmata_active_site'

/** Выбранная владельцем платформы организация. Пусто = смотрит все сразу. */
export const activeSite = {
  get: () => localStorage.getItem(SITE_KEY) ?? '',
  set: (id: string) => {
    if (id) localStorage.setItem(SITE_KEY, id)
    else localStorage.removeItem(SITE_KEY)
    // данные всех экранов зависят от организации — проще перезагрузить, чем
    // ловить полуобновлённые кэши react-query по всему приложению
    window.location.reload()
  },
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

async function request<T>(path: string, init?: RequestInit, isForm = false): Promise<T> {
  // FormData сам ставит Content-Type с boundary — не перебиваем.
  // ngrok-skip-browser-warning — чтобы ngrok не подменял ответ страницей-заглушкой.
  const headers: Record<string, string> = isForm
    ? { 'ngrok-skip-browser-warning': 'true' }
    : { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
  const token = auth.get()
  if (token) headers.Authorization = `Bearer ${token}`
  // Переключатель организаций: сервер учитывает заголовок ТОЛЬКО у админа и
  // только чтобы сузить видимость — у клиента он молча игнорируется.
  const site = activeSite.get()
  if (site) headers['X-Site-Id'] = site
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
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }, true),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  url: (path: string) => `${BASE}${path}`,
}

// Медиа-эндпоинты требуют Bearer — обычный <img src> не сработает
export async function fetchAuthedBlob(path: string): Promise<string> {
  const token = auth.get()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return URL.createObjectURL(await res.blob())
}
