import { useSyncExternalStore } from 'react'
import { auth } from '@/shared/api/client'

// Своё микро-хранилище на useSyncExternalStore — без zustand/context (YAGNI)
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((cb) => cb())
}

export const authActions = {
  login(token: string): void {
    auth.set(token)
    emit()
  },
  logout(): void {
    auth.clear()
    emit()
  },
}

export function useIsAuthed(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => auth.get() !== null,
  )
}
