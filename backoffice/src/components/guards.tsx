import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/shared/ui'
import { useAuth } from '@/auth/AuthContext'

/** Пускает в оболочку только с валидной сессией; иначе — на /login. */
export function RequireAuth() {
  const { authed, loading } = useAuth()
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)]">
        <Spinner />
      </div>
    )
  return authed ? <Outlet /> : <Navigate to="/login" replace />
}
