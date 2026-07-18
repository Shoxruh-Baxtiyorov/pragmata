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
  const [password, setPassword] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(password, {
      onSuccess: ({ access_token }) => {
        authActions.login(access_token)
        nav('/overview')
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-h2 text-brand">{t('login.title')}</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            type="password"
            placeholder={t('login.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={login.isError || undefined}
            autoFocus
          />
          {login.isError && (
            <div className="text-label text-error">
              {login.error instanceof ApiError && login.error.status === 401
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
