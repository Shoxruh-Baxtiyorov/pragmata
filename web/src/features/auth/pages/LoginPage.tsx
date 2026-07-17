import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/shared/ui'
import { ShieldAlert } from '@/shared/ui/icons'
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)] p-4">
      <Card className="w-full max-w-sm">
        <div className="px-6 pt-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-brand-500)] text-white">
            <ShieldAlert size={24} />
          </span>
          <h1 className="font-heading text-xl font-bold">Soqchi AI</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Security Copilot</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-secondary)]">
            {t('login.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-3 text-[var(--color-text-primary)] focus:border-[var(--color-brand-500)] focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}
          <Button type="submit" disabled={busy || !password}>
            {t('login.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
