import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/shared/ui'
import { login } from '../api/authApi'
import { authActions } from '../model/authStore'

export function LoginPage() {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { access_token } = await login(password)
      authActions.login(access_token)
    } catch {
      setError(t('login.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">{t('app.title')}</h1>
          <p className="text-sm text-[var(--color-muted)]">{t('app.subtitle')}</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-[var(--color-muted)]">
            {t('login.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-[var(--color-alert)]">{error}</p>}
          <Button type="submit" disabled={busy || !password}>
            {t('login.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
