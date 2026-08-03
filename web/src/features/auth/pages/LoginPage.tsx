import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, ErrorNote, FieldLabel, Input, LangSelect } from '@/shared/ui'
import { Logo } from '@/shared/ui/Logo'
import { ShieldCheck, Undo2 } from '@/shared/ui/icons'
import { ApiError } from '@/shared/api/client'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { useLogin } from '../api/authApi'
import { authActions } from '../model/authStore'

// Подпись поля: placeholder вместо label исчезает при вводе и хуже читается
// скринридером — поэтому у каждого поля своя видимая подпись.

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
      : apiErrorMessage(login.error, t)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
      {/* Язык переключают до входа, а внутри карточки выпадающий список обрезало
          бы её overflow-hidden — поэтому селектор стоит над карточкой. */}
      <div className="flex w-full max-w-sm justify-end">
        <LangSelect />
      </div>

      <Card className="w-full max-w-sm gap-6 p-6 shadow-[var(--shadow-modal)]">
        <header className="flex flex-col items-center gap-3 text-center">
          <Logo size={32} />
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">
            {mfaStep ? t('login.mfaSubtitle') : t('login.subtitle')}
          </h1>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {!mfaStep ? (
            <>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>{t('login.username')}</FieldLabel>
                <Input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={login.isError || undefined}
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>{t('login.password')}</FieldLabel>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={login.isError || undefined}
                />
              </label>
            </>
          ) : (
            <>
              {/* Второй шаг: видно, для какой учётки просят код — иначе поле
                  висит в воздухе без контекста. */}
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)]">
                <ShieldCheck size={16} className="text-[var(--color-brand-text)]" />
                <span className="truncate">{username}</span>
              </div>
              <label className="flex flex-col gap-1.5">
                <FieldLabel>{t('login.code')}</FieldLabel>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  aria-invalid={login.isError || undefined}
                  autoFocus
                />
              </label>
            </>
          )}

          {login.isError && errorText && <ErrorNote role="alert">{errorText}</ErrorNote>}

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
              <Undo2 size={16} /> {t('login.back')}
            </Button>
          )}
        </form>
      </Card>
    </div>
  )
}
