import { useSyncExternalStore } from 'react'

// Тёмная тема обязательна (iqbola-design). Переключение — data-theme на <html>.
const THEME_KEY = 'soqchi_theme'
type Theme = 'light' | 'dark'

const listeners = new Set<() => void>()

function current(): Theme {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function initTheme(): void {
  document.documentElement.dataset.theme = current()
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    current,
  )
  const toggle = () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_KEY, next)
    document.documentElement.dataset.theme = next
    listeners.forEach((cb) => cb())
  }
  return [theme, toggle]
}
