import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Input, LangSelect } from '@/shared/ui'
import { Logo } from '@/shared/ui/Logo'
import { useTheme } from '@/shared/hooks/useTheme'
import { cn } from '@/shared/lib/utils'
import { apiErrorMessage } from '@/shared/lib/apiError'
import {
  ArrowRight,
  BellRing,
  Bot,
  Check,
  Moon,
  ShieldAlert,
  Sun,
  UserRound,
  Users,
} from '@/shared/ui/icons'
import { useSubmitContact } from '../api/landingApi'

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

const FEATURES = [
  { icon: ShieldAlert, t: 'lp.f1.t', d: 'lp.f1.d' },
  { icon: Users, t: 'lp.f2.t', d: 'lp.f2.d' },
  { icon: Bot, t: 'lp.f3.t', d: 'lp.f3.d' },
] as const

export function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[var(--color-bg-app)] text-[var(--color-text-primary)]">
      {/* ── шапка ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border-soft)] bg-[var(--color-bg-app)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <Logo size={26} />
          <div className="flex items-center gap-1">
            <LangSelect />
            <ThemeToggle />
            <Link to="/login" className="ml-1">
              <Button size="sm">{t('lp.cta.login')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Hero />
        <Features />
        <Contact />
      </main>

      {/* ── подвал ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border-soft)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-caption text-[var(--color-text-subtle)] sm:flex-row">
          <Logo size={22} />
          <p>© Pragmata AI · {t('lp.footer.rights')}</p>
        </div>
      </footer>
    </div>
  )
}

function Hero() {
  const { t } = useTranslation()
  const trust = [t('lp.trust1'), t('lp.trust2'), t('lp.trust3')]
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-2 md:py-20">
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-text)]">
          {t('lp.hero.eyebrow')}
        </p>
        <h1 className="mt-3 text-[clamp(34px,5vw,54px)] font-extrabold leading-[1.05] tracking-tight">
          {t('lp.hero.titleA')}
          <br />
          <span className="text-[var(--color-brand-text)]">{t('lp.hero.titleEm')}</span>
        </h1>
        <p className="mt-5 max-w-md text-body leading-relaxed text-[var(--color-text-secondary)]">
          {t('lp.hero.lede')}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/login">
            <Button size="lg">
              {t('lp.cta.login')} <ArrowRight size={18} />
            </Button>
          </Link>
          <a href="#contact">
            <Button size="lg" variant="secondary">
              {t('lp.cta.contact')}
            </Button>
          </a>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
          {trust.map((tr) => (
            <li
              key={tr}
              className="flex items-center gap-1.5 text-caption text-[var(--color-text-secondary)]"
            >
              <Check size={16} className="text-[var(--color-brand-text)]" /> {tr}
            </li>
          ))}
        </ul>
      </div>

      <PreviewCard />
    </section>
  )
}

// Статичная превью-панель продукта (тёмный «экран» камеры в любой теме)
function PreviewCard() {
  const { t } = useTranslation()
  const alerts = [
    { label: t('lp.mock.a1'), time: '22:41', tone: 'var(--color-brand-500)' },
    { label: t('lp.mock.a2'), time: '02:13', tone: 'var(--color-warning-500)' },
    { label: t('lp.mock.a3'), time: '05:07', tone: 'var(--color-text-subtle)' },
  ]
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-lg)]">
      <div
        className="relative flex aspect-[16/10] items-center justify-center"
        style={{ background: 'linear-gradient(150deg, #0b1220 0%, #0f1b2e 60%, #10333a 100%)' }}
      >
        <div className="absolute left-3 top-3 font-mono text-[11px] tracking-wide text-white/70">
          {t('lp.mock.cam')}
        </div>
        {/* рамка детекции + силуэт */}
        <div className="relative">
          <div className="flex h-28 w-20 items-end justify-center rounded-md border-2 border-[var(--color-brand-400)] bg-white/5">
            <UserRound size={56} className="mb-1 text-white/45" />
          </div>
          <span
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ background: 'var(--color-brand-500)' }}
          >
            {t('lp.mock.detect')}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] text-white/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-brand-400)]" />
          LIVE
        </div>
      </div>
      <ul className="divide-y divide-[var(--color-border-soft)]">
        {alerts.map((a) => (
          <li key={a.label} className="flex items-center gap-3 px-4 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.tone }} />
            <BellRing size={16} className="shrink-0 text-[var(--color-text-subtle)]" />
            <span className="flex-1 truncate text-caption text-[var(--color-text-primary)]">
              {a.label}
            </span>
            <span className="shrink-0 font-mono text-caption text-[var(--color-text-subtle)]">
              {a.time}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Features() {
  const { t } = useTranslation()
  return (
    <section className="border-t border-[var(--color-border-soft)] bg-[var(--color-bg-surface)]">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-h1 font-bold tracking-tight">{t('lp.features.title')}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.t}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-app)] p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-500)]/12 text-[var(--color-brand-text)]">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 text-h3 font-semibold">{t(f.t)}</h3>
              <p className="mt-2 text-body leading-relaxed text-[var(--color-text-secondary)]">
                {t(f.d)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const { t } = useTranslation()
  const submit = useSubmitContact()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !contact.trim() || submit.isPending) return
    submit.mutate({ name: name.trim(), contact: contact.trim(), message: message.trim() })
  }

  return (
    <section id="contact" className="border-t border-[var(--color-border-soft)]">
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h2 className="text-h1 font-bold tracking-tight">{t('lp.contact.title')}</h2>
        <p className="mt-2 text-body text-[var(--color-text-secondary)]">{t('lp.contact.lede')}</p>

        {submit.isSuccess ? (
          <div className="mt-6 flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-brand-500)]/40 bg-[var(--color-brand-500)]/10 px-4 py-4 text-body text-[var(--color-brand-text)]">
            <Check size={20} /> {t('lp.contact.ok')}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder={t('lp.contact.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                placeholder={t('lp.contact.contact')}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
              />
            </div>
            <textarea
              placeholder={t('lp.contact.message')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className={cn(
                'w-full rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)]',
                'px-3 py-2 text-body text-[var(--color-text-primary)] outline-none transition',
                'placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]',
              )}
            />
            {submit.isError && (
              <p className="text-label text-[var(--color-error-500)]">
                {apiErrorMessage(submit.error, t) || t('lp.contact.err')}
              </p>
            )}
            <div>
              <Button type="submit" size="lg" loading={submit.isPending} disabled={!name.trim() || !contact.trim()}>
                {t('lp.contact.submit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
