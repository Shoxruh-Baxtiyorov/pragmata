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
  const [code, setCode] = useState('')
  const [mfaStep, setMfaStep] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(
      { username: username.trim(), password, ...(mfaStep ? { code: code.trim() } : {}) },
      {
        onSuccess: (res) => {
          if (res.mfa_required) {
            setMfaStep(true)
            return
          }
          authActions.login(res.access_token, res.role, res.username)
          nav('/overview')
        },
      },
    )
  }

  const errorText =
    login.error instanceof ApiError && (login.error.status === 401 || login.error.status === 403)
      ? mfaStep
        ? t('login.codeError')
        : t('login.error')
      : login.error?.message

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-h2 text-brand">{t('login.title')}</h1>
        <p className="mb-6 text-label text-text-secondary">
          {mfaStep ? t('login.mfaSubtitle') : t('login.subtitle')}
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {!mfaStep ? (
            <>
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
            </>
          ) : (
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t('login.code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={login.isError || undefined}
              autoFocus
            />
          )}
          {login.isError && errorText && (
            <div className="text-label text-error">{errorText}</div>
          )}
          <Button type="submit" size="lg" loading={login.isPending}>
            {mfaStep ? t('login.verify') : t('login.submit')}
          </Button>
          {mfaStep && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMfaStep(false)
                setCode('')
              }}
            >
              {t('login.back')}
            </Button>
          )}
        </form>
      </Card>
    </div>
  )
}
