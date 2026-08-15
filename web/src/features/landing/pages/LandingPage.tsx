import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Camera,
  Check,
  CircleCheck,
  Clock3,
  Cpu,
  Database,
  Eye,
  FileVideo,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Moon,
  Package,
  Play,
  RefreshCw,
  ScanFace,
  Server,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sun,
  UserSearch,
  X,
  type LucideIcon,
} from '@/shared/ui/icons'
import { Button, Input, LangSelect, Modal } from '@/shared/ui'
import { LogoMark } from '@/shared/ui/Logo'
import { useTheme } from '@/shared/hooks/useTheme'
import { landingCopy } from '../copy'
import { useSubmitContact } from '../api/landingApi'
import '../landing.css'

/* Снимки панели лежат в web/public/landing/. Если файла нет — на его месте
 * рисуется сетка-заглушка, страница не ломается (см. ShotFrame). */
const SHOTS = ['/landing/overview.png', '/landing/events.png']

const CAP_ICONS: LucideIcon[] = [ScanFace, BellRing, FileVideo, MessageCircle, UserSearch, Sparkles]
const IND_ICONS: LucideIcon[] = [Package, ShoppingCart, GraduationCap]
const FLOW_ICONS: LucideIcon[] = [Eye, Cpu, BellRing, FileVideo]
const PROOF_ICONS: LucideIcon[] = [Camera, Database, LockKeyhole, RefreshCw]

/* Появление по скроллу без framer-motion (его нет в зависимостях web/):
 * один IntersectionObserver на блок, дальше всё делает CSS-переход. */
function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect() // once: обратно не прячем
        }
      },
      { threshold: 0.18 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      className={`lp-reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  )
}

function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, toggle] = useTheme()
  return (
    <button
      type="button"
      className="lp-theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
      title={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function Kicker({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={`lp-kicker ${dark ? 'lp-kicker--dark' : ''}`}>
      <i />
      <span>{children}</span>
    </div>
  )
}

function Logo({ small = false, label }: { small?: boolean; label: string }) {
  const { i18n } = useTranslation()
  const c = landingCopy(i18n.language)
  return (
    <a className={`lp-logo ${small ? 'lp-logo--sm' : ''}`} href="#top" aria-label={label}>
      <span className="lp-logo__mark">
        <LogoMark size={small ? 27 : 38} />
      </span>
      {!small && (
        <span className="lp-logo__lockup">
          <span className="lp-logo__name">{c.brand.name}</span>
          <span className="lp-logo__desc">{c.brand.descriptor}</span>
        </span>
      )}
    </a>
  )
}

/* Силуэт человека внутри рамки распознавания — вместо фотографии */
function PersonGlyph() {
  return (
    <svg className="lp-cam__person" viewBox="0 0 40 96" aria-hidden="true" focusable="false">
      <circle cx="20" cy="11" r="8" fill="currentColor" />
      <path
        d="M20 22c-8 0-13 5-14 13l-2 20h6l1 41h18l1-41h6l-2-20c-1-8-6-13-14-13Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ShotFrame({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`lp-shot__frame ${failed ? 'lp-shot__frame--empty' : ''}`}>
      <div className="lp-shot__bar">
        <i />
        <i />
        <i />
      </div>
      {failed ? (
        <LayoutDashboard size={32} />
      ) : (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  )
}

export function LandingPage() {
  const { t, i18n } = useTranslation()
  const c = landingCopy(i18n.language)
  const [stuck, setStuck] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 28)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const nav = [
    { href: '#how', label: c.nav.how },
    { href: '#capabilities', label: c.nav.capabilities },
    { href: '#product', label: c.nav.product },
    { href: '#industries', label: c.nav.industries },
    { href: '#privacy', label: c.nav.privacy },
  ]

  return (
    <div className="lp" id="top">
      <header className={`lp-head ${stuck ? 'lp-head--stuck' : ''}`}>
        <div className="lp-container lp-head__inner">
          <Logo label={c.a11y.home} />
          <nav className="lp-nav" aria-label={c.a11y.nav}>
            {nav.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="lp-head__tools">
            <LangSelect />
            <ThemeToggle />
            <Link to="/login" className="lp-headcta">
              <span>{t('lp.cta.login')}</span>
              <ArrowUpRight size={16} />
            </Link>
            <button
              type="button"
              className="lp-burger"
              aria-expanded={menuOpen}
              aria-label={c.a11y.menu}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <X size={20} />
              ) : (
                <span aria-hidden="true">
                  <i />
                  <i />
                </span>
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lp-mnav">
            {nav.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}
                <ArrowRight size={16} />
              </a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              {t('lp.cta.login')}
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* ── герой ─────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-hero__glow" aria-hidden="true" />
          <div className="lp-container lp-hero__grid">
            <Reveal>
              <div className="lp-eyebrow">
                <span className="lp-dot lp-dot--alert" />
                {c.hero.eyebrow}
              </div>
              <h1>
                {c.hero.titleA}
                <br />
                <em>{c.hero.titleEm}</em>
              </h1>
              <p className="lp-hero__lede">{c.hero.lede}</p>
              <div className="lp-hero__actions">
                <Button size="lg" onClick={() => setDialogOpen(true)}>
                  {c.hero.ctaPrimary}
                  <ArrowRight size={16} />
                </Button>
                <a className="lp-tlink" href="#how">
                  <Play size={16} />
                  {c.hero.ctaSecondary}
                </a>
              </div>
              <div className="lp-trust">
                {c.hero.trust.map((t) => (
                  <span key={t}>
                    <Check size={16} />
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="lp-camwrap">
                <div className="lp-cam">
                  <div className="lp-cam__scene" aria-hidden="true">
                    <div className="lp-cam__racks" />
                    <div className="lp-cam__floor" />
                    <div className="lp-cam__crate lp-cam__crate--a" />
                    <div className="lp-cam__crate lp-cam__crate--b" />
                  </div>
                  <div className="lp-cam__vignette" aria-hidden="true" />
                  <div className="lp-cam__top">
                    <span>{c.panel.cam}</span>
                    <span>{c.panel.time}</span>
                  </div>
                  <div className="lp-cam__box">
                    <i />
                    <i />
                    <i />
                    <i />
                    <PersonGlyph />
                    <span className="lp-cam__tag">{c.panel.target}</span>
                  </div>
                  <div className="lp-cam__scanline" aria-hidden="true" />
                  <div className="lp-cam__loop">
                    <RefreshCw size={16} />
                    <span>{c.panel.loop}</span>
                  </div>
                  <div className="lp-cam__foot">
                    <span className="lp-dot lp-dot--ok" />
                    <span>{c.panel.tracking}</span>
                    <b>{c.panel.trackingMeta}</b>
                  </div>
                </div>

                <div className="lp-feed" aria-label={c.a11y.feed}>
                  <div className="lp-feed__head">
                    <span className="lp-dot lp-dot--ok" />
                    <span>{c.feed.head}</span>
                    <b>{c.feed.count}</b>
                  </div>
                  <div className="lp-feed__list">
                    {c.feed.items.map((item, i) => (
                      <div
                        key={item.time}
                        className="lp-feed__row"
                        style={{ animationDelay: `${0.9 + i * 0.14}s` }}
                      >
                        <span
                          className={`lp-dot ${['lp-dot--alert', 'lp-dot--ok', 'lp-dot--soft'][i] ?? 'lp-dot--soft'}`}
                        />
                        <time>{item.time}</time>
                        <span className="lp-feed__copy">
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </span>
                        <ArrowUpRight size={16} />
                      </div>
                    ))}
                  </div>
                  <div className="lp-feed__foot">
                    <span>{c.feed.footer}</span>
                    <span>
                      <MessageCircle size={16} /> TG
                    </span>
                  </div>
                </div>
              </div>
              <div className="lp-cam__caption">
                <span>{c.panel.caption}</span>
                <span>{c.panel.captionRight}</span>
              </div>
            </Reveal>
          </div>

          <div className="lp-container lp-heroline">
            <span>{c.hero.bottomLeft}</span>
            <a href="#capabilities">
              {c.hero.bottomRight} <ArrowDown size={16} />
            </a>
          </div>
        </section>

        {/* ── полоса-довод ──────────────────────────────────────────── */}
        <section className="lp-proof">
          <div className="lp-container lp-proof__inner">
            <div className="lp-proof__lead">
              <b>00</b>
              <span>{c.proof.lead}</span>
            </div>
            <div className="lp-proof__items">
              {c.proof.items.map((item, i) => {
                const Icon = PROOF_ICONS[i] ?? Camera
                return (
                  <div key={item}>
                    <Icon size={20} />
                    <span>{item}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── от архива к караулу ───────────────────────────────────── */}
        <section className="lp-shift lp-on-paper" id="how">
          <div className="lp-container lp-shift__grid">
            <Reveal className="lp-shift__title">
              <Kicker>{c.shift.kicker}</Kicker>
              <h2>
                {c.shift.titleA}
                <br />
                <em>{c.shift.titleEm}</em>
              </h2>
              <p>{c.shift.text}</p>
              <a className="lp-tlink lp-tlink--paper" href="#capabilities">
                {c.shift.link} <ArrowRight size={16} />
              </a>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="lp-cmp">
                <div className="lp-cmp__card lp-cmp__card--old">
                  <div className="lp-cmp__head">
                    <span>{c.shift.before.label}</span>
                    <b>{c.shift.before.tag}</b>
                  </div>
                  <div className="lp-cmp__icon">
                    <Eye size={24} />
                  </div>
                  <h3>{c.shift.before.title}</h3>
                  <p>{c.shift.before.text}</p>
                  <span className="lp-cmp__meta">{c.shift.before.meta}</span>
                </div>
                <div className="lp-cmp__arrow" aria-hidden="true">
                  <ArrowRight size={20} />
                </div>
                <div className="lp-cmp__card lp-cmp__card--new">
                  <div className="lp-cmp__head">
                    <span>{c.shift.after.label}</span>
                    <b>{c.shift.after.tag}</b>
                  </div>
                  <div className="lp-cmp__icon">
                    <AlertTriangle size={24} />
                  </div>
                  <h3>{c.shift.after.title}</h3>
                  <p>{c.shift.after.text}</p>
                  <span className="lp-cmp__meta">{c.shift.after.meta}</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── возможности ──────────────────────────────────────────── */}
        <section className="lp-caps lp-on-ink" id="capabilities">
          <div className="lp-container">
            <Reveal className="lp-secthead lp-secthead--dark">
              <div>
                <Kicker dark>{c.capabilities.kicker}</Kicker>
                <h2>
                  {c.capabilities.titleA}
                  <br />
                  <em>{c.capabilities.titleEm}</em>
                </h2>
              </div>
              <p>{c.capabilities.lede}</p>
            </Reveal>
            <ul className="lp-caps__list">
              {c.capabilities.items.map((item, i) => {
                const Icon = CAP_ICONS[i] ?? Sparkles
                return (
                  <Reveal as="li" key={item.title} className="lp-cap" delay={i * 0.05}>
                    <span className="lp-cap__n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="lp-cap__icon">
                      <Icon size={20} />
                    </span>
                    <div className="lp-cap__copy">
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                    <div className="lp-cap__tags">
                      {item.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <ArrowUpRight size={16} />
                  </Reveal>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ── панель: реальные снимки ───────────────────────────────── */}
        <section className="lp-product lp-on-paper" id="product">
          <div className="lp-container">
            <Reveal className="lp-secthead">
              <div>
                <Kicker>{c.product.kicker}</Kicker>
                <h2>
                  {c.product.titleA}
                  <br />
                  <em>{c.product.titleEm}</em>
                </h2>
              </div>
              <p>{c.product.lede}</p>
            </Reveal>
            <div className="lp-shots">
              {c.product.shots.map((shot, i) => (
                <Reveal key={shot.title} className="lp-shot" delay={i * 0.08}>
                  <ShotFrame src={SHOTS[i] ?? SHOTS[0]} alt={shot.title} />
                  <div className="lp-shot__body">
                    <h3>{shot.title}</h3>
                    <p>{shot.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── отрасли ──────────────────────────────────────────────── */}
        <section className="lp-ind lp-on-paper" id="industries">
          <div className="lp-container">
            <Reveal className="lp-secthead">
              <div>
                <Kicker>{c.industries.kicker}</Kicker>
                <h2>
                  {c.industries.titleA}
                  <br />
                  <em>{c.industries.titleEm}</em>
                </h2>
              </div>
              <p>{c.industries.lede}</p>
            </Reveal>
            <div className="lp-ind__grid">
              {c.industries.items.map((item, i) => {
                const Icon = IND_ICONS[i] ?? Package
                return (
                  <Reveal key={item.label} className="lp-ind__card" delay={i * 0.08}>
                    <div className="lp-ind__tile">
                      <span className="lp-ind__glyph" aria-hidden="true">
                        <Icon size={32} />
                      </span>
                      <span className="lp-ind__label">{item.label}</span>
                      <span className="lp-ind__badge">
                        <Icon size={20} />
                      </span>
                    </div>
                    <div className="lp-ind__body">
                      <div className="lp-slip">
                        <span>
                          <Clock3 size={16} /> 22:41:08
                        </span>
                        <span>
                          <CircleCheck size={16} /> {c.industries.slip}
                        </span>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                      <a className="lp-tlink lp-tlink--paper" href="#privacy">
                        {c.industries.link} <ArrowRight size={16} />
                      </a>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── приватность ──────────────────────────────────────────── */}
        <section className="lp-priv lp-on-ink" id="privacy">
          <div className="lp-priv__bg" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="lp-container lp-priv__grid">
            <Reveal className="lp-priv__copy">
              <Kicker dark>{c.privacy.kicker}</Kicker>
              <h2>
                {c.privacy.titleA}
                <br />
                <em>{c.privacy.titleEm}</em>
              </h2>
              <div className="lp-priv__answer">
                <b>{c.privacy.no}</b>
                <p>{c.privacy.text}</p>
              </div>
              <div className="lp-priv__points">
                {c.privacy.points.map((p) => (
                  <span key={p}>
                    <CircleCheck size={16} /> {p}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="lp-sys">
                <div className="lp-sys__head">
                  <span>{c.privacy.panelHead}</span>
                  <span className="lp-dot lp-dot--ok" />
                </div>
                <div className="lp-sys__core">
                  <div className="lp-sys__ring lp-sys__ring--1" />
                  <div className="lp-sys__ring lp-sys__ring--2" />
                  <div className="lp-sys__orbit" />
                  <div className="lp-sys__orbit lp-sys__orbit--2" />
                  <ShieldCheck size={32} />
                </div>
                <div className="lp-sys__foot">
                  <span>
                    <Server size={16} />
                  </span>
                  <strong>{c.privacy.panelStrong}</strong>
                  <small>{c.privacy.panelSmall}</small>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── рабочий контур ───────────────────────────────────────── */}
        <section className="lp-flow lp-on-paper">
          <div className="lp-container">
            <Reveal className="lp-secthead">
              <div>
                <Kicker>{c.workflow.kicker}</Kicker>
                <h2>
                  {c.workflow.titleA}
                  <br />
                  <em>{c.workflow.titleEm}</em>
                </h2>
              </div>
              <p>{c.workflow.lede}</p>
            </Reveal>
            <div className="lp-flow__line" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="lp-flow__grid">
              {c.workflow.steps.map((step, i) => {
                const Icon = FLOW_ICONS[i] ?? Eye
                return (
                  <Reveal key={step.title} className="lp-flow__step" delay={i * 0.08}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <Icon size={20} />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── финальный призыв ─────────────────────────────────────── */}
        <section className="lp-cta lp-on-ink">
          <div className="lp-cta__grain" aria-hidden="true" />
          <div className="lp-container lp-cta__grid">
            <Reveal className="lp-cta__copy">
              <Kicker dark>{c.finalCta.kicker}</Kicker>
              <h2>
                {c.finalCta.titleA}
                <br />
                <em>{c.finalCta.titleEm}</em>
              </h2>
              <p>{c.finalCta.text}</p>
              <Button size="lg" onClick={() => setDialogOpen(true)}>
                {c.finalCta.button}
                <ArrowRight size={16} />
              </Button>
            </Reveal>
            <Reveal className="lp-cta__aside" delay={0.14}>
              <LogoMark size={56} />
              <div>
                <span>{c.brand.name} AI</span>
                <strong>{c.finalCta.asideStrong}</strong>
              </div>
              <div className="lp-cta__meta">
                <span>{c.finalCta.metaLeft}</span>
                <span>{c.finalCta.metaRight}</span>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-container lp-foot__inner">
          <Logo small label={c.a11y.home} />
          <span className="lp-foot__tagline">{c.footer.tagline}</span>
          <div className="lp-foot__links">
            <a href="#capabilities">{c.nav.capabilities}</a>
            <a href="#privacy">{c.nav.privacy}</a>
            <button type="button" onClick={() => setDialogOpen(true)}>
              {c.footer.contact}
            </button>
            <Link to="/login">{c.footer.login}</Link>
          </div>
          <span className="lp-foot__copy">{c.footer.copyright}</span>
        </div>
      </footer>

      {dialogOpen && <ContactModal onClose={() => setDialogOpen(false)} />}
    </div>
  )
}

// Реальная форма «Связаться» → POST /api/v1/contact (публичный, без авторизации)
function ContactModal({ onClose }: { onClose: () => void }) {
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
    <Modal onClose={onClose}>
      <h2 className="pr-8 text-h2 font-semibold text-[var(--color-text-primary)]">
        {t('lp.contact.title')}
      </h2>
      <p className="mt-1 text-body text-[var(--color-text-secondary)]">{t('lp.contact.lede')}</p>

      {submit.isSuccess ? (
        <div className="mt-5 flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-brand-500)]/40 bg-[var(--color-brand-500)]/10 px-4 py-4 text-body text-[var(--color-brand-text)]">
          <Check size={20} /> {t('lp.contact.ok')}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
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
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] px-3 py-2 text-body text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-subtle)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]"
          />
          {submit.isError && (
            <p className="text-label text-[var(--color-error-500)]">{t('lp.contact.err')}</p>
          )}
          <div>
            <Button
              type="submit"
              size="lg"
              loading={submit.isPending}
              disabled={!name.trim() || !contact.trim()}
            >
              {t('lp.contact.submit')} <ArrowRight size={16} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
