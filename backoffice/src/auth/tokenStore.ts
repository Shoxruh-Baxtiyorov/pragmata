/**
 * Хранение сессии бэкофиса. Сессия = JWT (refresh нет), держим в sessionStorage:
 * внутренний инструмент, токен живёт в пределах вкладки, а не бессрочно.
 */
const TOKEN_KEY = 'pragmata_bo_token'
const NAME_KEY = 'pragmata_bo_username'

let listeners: Array<() => void> = []

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getUsername(): string {
  return sessionStorage.getItem(NAME_KEY) ?? ''
}

export function setToken(token: string, username: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(NAME_KEY, username)
  listeners.forEach((fn) => fn())
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(NAME_KEY)
  listeners.forEach((fn) => fn())
}

export function onTokenChange(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}
