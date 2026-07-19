import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { useLogin } from '../api/authApi'
import { authActions } from '../model/authStore'

export function LoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const login = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: ({ access_token, role, username: uname }) => {
          authActions.login(access_token, role, uname)
          nav('/overview')
        },
      },
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-h2 text-brand">{t('login.title')}</h1>
        <p className="mb-6 text-label text-text-secondary">{t('login.subtitle')}</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            type="text"
            autoComplete="username"
            placeholder={t('login.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={login.isError || undefined}
            autoFocus
          />
          <Input
            type="password"
            autoComplete="current-password"
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={login.isError || undefined}
          />
          {login.isError && (
            <div className="text-label text-error">
              {login.error instanceof ApiError &&
              (login.error.status === 401 || login.error.status === 403)
                ? t('login.error')
                : login.error.message}
            </div>
          )}
          <Button type="submit" size="lg" loading={login.isPending}>
            {t('login.submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
