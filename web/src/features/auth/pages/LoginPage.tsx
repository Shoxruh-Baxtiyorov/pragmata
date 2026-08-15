import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, ErrorNote, FieldLabel, Input, LangSelect } from '@/shared/ui'
import { Logo, LogoMark } from '@/shared/ui/Logo'
import { Eye, EyeOff, Moon, ShieldCheck, Sun, Undo2 } from '@/shared/ui/icons'
import { useTheme } from '@/shared/hooks/useTheme'
import { ApiError } from '@/shared/api/client'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { useLogin } from '../api/authApi'
import { authActions } from '../model/authStore'

// Рассыпанные знаки-диафрагмы на брендовой панели: позиция/размер/поворот/прозрачность.
const MARKS = [
  { top: '-6%', left: '4%', size: 220, op: 0.1, rot: -12 },
  { top: '12%', left: '70%', size: 300, op: 0.08, rot: 22 },
  { top: '62%', left: '-4%', size: 340, op: 0.07, rot: 8 },
  { top: '74%', left: '66%', size: 240, op: 0.09, rot: -18 },
  { top: '40%', left: '30%', size: 160, op: 0.08, rot: 30 },
]

// Подпись поля: placeholder вместо label исчезает при вводе и хуже читается
// скринридером — поэтому у каждого поля своя видимая подпись.

function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, toggle] = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
      aria-label={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] outline-none transition hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const login = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
    <div className="flex min-h-screen w-full overflow-hidden bg-[var(--color-bg-surface)]">
      {/* ── левая колонка: брендовая панель с лого (скрыта на мобилке) ──────── */}
      <div
        className="relative hidden overflow-hidden md:flex md:flex-1"
        style={{ background: 'var(--lp-login-grad)' }}
      >
        {/* мягкие световые пятна поверх градиента для глубины */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(700px 500px at 18% 12%, rgba(255,255,255,0.22), transparent 60%), radial-gradient(600px 600px at 92% 88%, rgba(0,0,0,0.22), transparent 55%)',
          }}
        />
        {/* рассыпанные знаки-диафрагмы (текстура бренда) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 text-white">
          {MARKS.map((m, i) => (
            <span
              key={i}
              className="absolute"
              style={{ top: m.top, left: m.left, opacity: m.op, transform: `rotate(${m.rot}deg)` }}
            >
              <LogoMark size={m.size} />
            </span>
          ))}
        </div>

        {/* контент панели */}
        <div className="relative z-10 flex flex-col justify-center gap-6 px-12 lg:px-16">
          <div className="flex items-center gap-4 text-white">
            <LogoMark size={64} />
            <span
              className="font-extrabold uppercase leading-none"
              style={{ letterSpacing: '0.14em', fontSize: 34 }}
            >
              Pragmata&nbsp;AI
            </span>
          </div>
          <h2 className="max-w-md text-h1 font-bold leading-tight text-white">
            {t('login.brandLead')}
          </h2>
          <p className="max-w-md text-body text-white/85">{t('login.tagline')}</p>
        </div>
      </div>

      {/* ── правая колонка: форма входа ────────────────────────────────────── */}
      <div className="flex w-full shrink-0 flex-col justify-between p-6 sm:p-10 md:w-[44%] lg:w-[40%] xl:w-[36%]">
        <header className="flex items-center justify-between">
          <Logo size={28} />
          <div className="flex items-center gap-1">
            <LangSelect />
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-sm flex-col">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-mark)]">
            {t('login.welcome')}
          </p>
          <h1 className="mt-1.5 text-h2 font-bold text-[var(--color-text-primary)]">
            {mfaStep ? t('login.mfaSubtitle') : t('login.subtitle')}
          </h1>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
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
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={login.isError || undefined}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-subtle)] outline-none transition hover:text-[var(--color-text-primary)]"
                      aria-label={showPw ? t('login.hidePassword') : t('login.showPassword')}
                      title={showPw ? t('login.hidePassword') : t('login.showPassword')}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
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

            <Button type="submit" size="lg" loading={login.isPending} className="mt-1">
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
        </div>

        <p className="text-center text-caption text-[var(--color-text-muted)]">{t('login.tagline')}</p>
      </div>
    </div>
  )
}
