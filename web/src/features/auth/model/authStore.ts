import { useSyncExternalStore } from 'react'
import { auth } from '@/shared/api/client'

let listeners: (() => void)[] = []
function emit() {
  listeners.forEach((l) => l())
}

export const authActions = {
  login: (token: string) => {
    auth.set(token)
    emit()
  },
  logout: () => {
    auth.clear()
    emit()
  },
}

export function useIsAuthed(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.push(cb)
      return () => {
        listeners = listeners.filter((l) => l !== cb)
      }
    },
    () => auth.get() !== null,
  )
}
