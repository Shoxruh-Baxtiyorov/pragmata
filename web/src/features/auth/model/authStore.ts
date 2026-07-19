import { useSyncExternalStore } from 'react'
import { auth } from '@/shared/api/client'

// Своё микро-хранилище на useSyncExternalStore — без zustand/context (YAGNI)
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((cb) => cb())
}

export const authActions = {
  login(token: string, role = 'user', username = ''): void {
    auth.set(token, role, username)
    emit()
  },
  logout(): void {
    auth.clear()
    emit()
  },
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useIsAuthed(): boolean {
  return useSyncExternalStore(subscribe, () => auth.get() !== null)
}

export function useIsAdmin(): boolean {
  return useSyncExternalStore(subscribe, () => auth.role() === 'admin')
}

export function useUsername(): string {
  return useSyncExternalStore(subscribe, () => auth.username())
}
