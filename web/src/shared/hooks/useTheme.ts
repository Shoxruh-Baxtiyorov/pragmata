import { useSyncExternalStore } from 'react'

// Тёмная тема обязательна (iqbola-design). Переключение — data-theme на <html>.
const THEME_KEY = 'pragmata_theme'
type Theme = 'light' | 'dark'

const listeners = new Set<() => void>()

function current(): Theme {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

function apply(theme: Theme): void {
  // Три механизма темы держим в синхроне:
  //  - data-theme        — легаси-компоненты Ziyo,
  //  - .dark             — shadcn-варианты кита (ремап семантических токенов),
  //  - data-color-scheme — СЫРАЯ тёмная палитра кита (--color-bg-surface и т.д.);
  //    без него карточки/сайдбар оставались белыми на тёмном фоне.
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.colorScheme = theme
  root.classList.toggle('dark', theme === 'dark')
}

export function initTheme(): void {
  apply(current())
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
    apply(next)
    listeners.forEach((cb) => cb())
  }
  return [theme, toggle]
}
