import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/api/client'
import { clearToken, getToken, onTokenChange, setToken } from './tokenStore'

export type BackofficeRole = 'admin' | 'user'

export interface Me {
  sub: string
  username: string
  role: string
  backoffice: boolean
}

interface AuthState {
  me: Me | null
  loading: boolean
  authed: boolean
  signIn: (token: string, username: string) => void
  signOut: () => void
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => onTokenChange(() => setTick((n) => n + 1)), [])

  useEffect(() => {
    let alive = true
    if (!getToken()) {
      setMe(null)
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .get<Me>('/api/v1/me')
      .then((m) => alive && setMe(m))
      .catch(() => alive && setMe(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [tick])

  const value: AuthState = {
    me,
    loading,
    authed: !!me,
    signIn: (token, username) => setToken(token, username),
    signOut: () => {
      clearToken()
      setMe(null)
    },
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth вне AuthProvider')
  return ctx
}
