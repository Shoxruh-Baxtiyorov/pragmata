import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Input, Label } from '@/shared/ui'
import Logo from '@/shared/ui/Logo'
import { ApiError, login } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'

export function LoginPage() {
  const { authed, signIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (authed) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await login(username.trim(), password, needCode ? code.trim() : undefined)
      if (r.mfa_required) {
        setNeedCode(true)
        setError('Введите код из приложения-аутентификатора')
        return
      }
      signIn(r.access_token, username.trim())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка входа')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)] p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] p-7 shadow-[var(--shadow-modal)]">
        <div className="mb-6 flex justify-center">
          <Logo size={28} />
        </div>
        <h1 className="mb-1 text-center text-lg font-bold text-[var(--color-text-primary)]">
          Вход в бэкофис
        </h1>
        <p className="mb-6 text-center text-[13px] text-[var(--color-text-muted)]">
          Доступ только для аккаунтов из allowlist
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u">Имя пользователя</Label>
            <Input
              id="u"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={needCode}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p">Пароль</Label>
            <Input
              id="p"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={needCode}
            />
          </div>
          {needCode && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c">Код 2FA</Label>
              <Input
                id="c"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
                required
              />
            </div>
          )}
          {error && <p className="text-[13px] text-[var(--color-danger-text)]">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Вход…' : 'Войти'}
          </Button>
        </form>
      </div>
    </div>
  )
}
