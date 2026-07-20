import { useState, type FormEvent } from 'react'
import { ApiError, login, session } from '../api'
import { Button, Card, Field, Input } from '../ui'
import { Logo } from '../logo'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [needCode, setNeedCode] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
      session.set(r.access_token, username.trim())
      onLogin()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка входа')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-7">
        <div className="mb-6 flex justify-center">
          <Logo size={26} />
        </div>
        <h1 className="mb-1 text-center text-h3 font-semibold">Вход в бэкофис</h1>
        <p className="mb-6 text-center text-label text-text-secondary">
          Доступ только для аккаунтов из allowlist
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Имя пользователя">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={needCode}
            />
          </Field>
          <Field label="Пароль">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={needCode}
            />
          </Field>
          {needCode && (
            <Field label="Код 2FA">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
                required
              />
            </Field>
          )}
          {error && <p className="text-label text-error">{error}</p>}
          <Button type="submit" loading={busy}>
            Войти
          </Button>
        </form>
      </Card>
    </div>
  )
}
