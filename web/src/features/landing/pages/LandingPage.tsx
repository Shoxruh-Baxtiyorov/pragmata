import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Camera,
  Cpu,
  Eye,
  FileVideo,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageCircle,
  Package,
  Play,
  RefreshCw,
  ScanFace,
  Server,
  ShoppingCart,
  Sparkles,
  UserSearch,
  X,
  type LucideIcon,
} from '@/shared/ui/icons'
import { LangSelect, Modal } from '@/shared/ui'
import { LogoMark } from '@/shared/ui/Logo'
import { CONTACT_EMAIL, landingCopy } from '../copy'
import '../landing.css'

/* Снимки панели лежат в web/public/landing/ — это настоящие экраны продукта,
 * а не рисованные макеты. Если файла нет, ShotFrame рисует заглушку, страница
 * не ломается. */
const SHOT_EVENTS = '/landing/events.png'
const SHOT_OVERVIEW = '/landing/overview.png'

const CAP_ICONS: LucideIcon[] = [ScanFace, BellRing, FileVideo, MessageCircle, UserSearch, Sparkles]
const IND_ICONS: LucideIcon[] = [Package, ShoppingCart, GraduationCap]
const FLOW_ICONS: LucideIcon[] = [Eye, Cpu, BellRing, FileVideo]
const PROOF_ICONS: LucideIcon[] = [Camera, Server, LockKeyhole, RefreshCw]

/* Бенто: у каждой плитки свой размер и своя плотность. Крупные несут текст,
 * мелкие — только заголовок с глифом. Порядок совпадает с copy.capabilities,
 * раскладка на 4 колонки: [4 4 1 1] / [4 4 2 3] / [5 5 6 6]. */
const BENTO: { mod: string; text: boolean }[] = [
  { mod: 'lp-tile--wide', text: true },
  { mod: '', text: false },
  { mod: '', text: false },
  // крупная плитка показывает сам диалог — абзац дублировал бы тот же вопрос
  { mod: 'lp-tile--hero', text: false },
  { mod: 'lp-tile--wide', text: true },
  { mod: 'lp-tile--wide', text: true },
]

/* Появление по скроллу без framer-motion (его нет в зависимостях web/):
 * один IntersectionObserver на блок, дальше всё делает CSS-переход. */
function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
  id,
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'section'
  id?: string
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
      { threshold: 0.12 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      id={id}
      className={`lp-reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  )
}

function Logo({ label }: { label: string }) {
  const { i18n } = useTranslation()
  const c = landingCopy(i18n.language)
  return (
    <a className="lp-logo" href="#top" aria-label={label}>
      <span className="lp-logo__mark">
        <LogoMark size={26} />
      </span>
      <span className="lp-logo__name">{c.brand.name}</span>
    </a>
  )
}

/* Рамка окна вокруг снимка панели: тонкий бар + адрес. Адрес берём из того
 * же домена, что и контактная почта: `.local` намекал бы на установку у
 * клиента, а панель живёт на сервере Pragmata. */
function ShotFrame({ src, alt, fade = false }: { src: string; alt: string; fade?: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`lp-shot ${failed ? 'lp-shot--empty' : ''}`}>
      <div className="lp-shot__bar">
        <i />
        <i />
        <i />
        <span className="lp-shot__url">{CONTACT_EMAIL.split('@')[1]}</span>
      </div>
      {/* fade: длинный экран не обрезаем «по живому», а гасим к низу */}
      <div className={`lp-shot__view ${fade ? 'lp-shot__view--fade' : ''}`}>
        {failed ? (
          <LayoutDashboard size={32} />
        ) : (
          <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
        )}
      </div>
    </div>
  )
}

export function LandingPage() {
  const { i18n } = useTranslation()
  const c = landingCopy(i18n.language)
  const [stuck, setStuck] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12)
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
            <span className="lp-lang">
              <LangSelect />
            </span>
            <button
              type="button"
              className="lp-btn lp-btn--ghost lp-btn--sm"
              onClick={() => setDialogOpen(true)}
            >
              {c.headerCta}
            </button>
            <button
              type="button"
              className="lp-burger"
              aria-expanded={menuOpen}
              aria-label={c.a11y.menu}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
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
          </div>
        )}
      </header>

      <main>
        {/* ── герой ─────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-container">
            <Reveal className="lp-hero__copy">
              <p className="lp-formula">
                <span>{c.hero.formula.split('→')[0].trim()}</span>
                <i aria-hidden="true">→</i>
                <b>{c.hero.formula.split('→')[1]?.trim()}</b>
              </p>
              <h1 className="lp-h1">
                {c.hero.titleA}
                <br />
                <em>{c.hero.titleEm}</em>
              </h1>
              <p className="lp-lede">{c.hero.lede}</p>
              <div className="lp-hero__actions">
                <button
                  type="button"
                  className="lp-btn lp-btn--primary"
                  onClick={() => setDialogOpen(true)}
                >
                  {c.headerCta}
                  <ArrowRight size={16} />
                </button>
                <a className="lp-btn lp-btn--ghost" href="#how">
                  <Play size={16} />
                  {c.hero.ctaPrimary}
                </a>
              </div>
            </Reveal>

            <Reveal className="lp-heroshot" delay={0.1}>
              <div className="lp-heroshot__frame">
                <ShotFrame src={SHOT_EVENTS} alt={c.product.shots[1].title} fade />
                {/* Карточка вынесена из рамки: у .lp-shot overflow:hidden,
                    внутри её левый край обрезался бы. */}
                <div className="lp-alert" aria-label={c.a11y.feed}>
                  <span className="lp-dot lp-dot--alert" />
                  <span className="lp-alert__copy">
                    <strong>{c.sample.label}</strong>
                    <small>{c.sample.detail}</small>
                  </span>
                  <time>{c.sample.time}</time>
                </div>
              </div>
            </Reveal>
          </div>

          {/* полоса доводов — та же секция, отделена линиями */}
          <div className="lp-proof">
            <div className="lp-container lp-proof__inner">
              <span className="lp-proof__lead">{c.proof.lead}</span>
              <div className="lp-proof__items">
                {c.proof.items.map((item, i) => {
                  const Icon = PROOF_ICONS[i] ?? Camera
                  return (
                    <div key={item}>
                      <Icon size={16} />
                      <span>{item}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── от архива к караулу + рабочий контур ──────────────────── */}
        <section className="lp-section" id="how">
          <div className="lp-container">
            <div className="lp-shift__grid">
              <Reveal className="lp-shift__title">
                <div className="lp-kicker">{c.shift.kicker}</div>
                <h2 className="lp-h2">
                  {c.shift.titleA}
                  <br />
                  <em>{c.shift.titleEm}</em>
                </h2>
                <p>{c.shift.text}</p>
                <a className="lp-tlink" href="#capabilities">
                  {c.shift.link} <ArrowRight size={16} />
                </a>
              </Reveal>

              <Reveal delay={0.08}>
                <div className="lp-cmp">
                  <div className="lp-cmp__card">
                    <div className="lp-cmp__head">
                      <span>{c.shift.before.label}</span>
                      <b>{c.shift.before.tag}</b>
                    </div>
                    <div className="lp-cmp__icon">
                      <Eye size={22} />
                    </div>
                    <h3>{c.shift.before.title}</h3>
                    <p>{c.shift.before.text}</p>
                    <span className="lp-cmp__meta">{c.shift.before.meta}</span>
                  </div>
                  <div className="lp-cmp__card lp-cmp__card--new">
                    <div className="lp-cmp__head">
                      <span>{c.shift.after.label}</span>
                      <b>{c.shift.after.tag}</b>
                    </div>
                    <div className="lp-cmp__icon">
                      <AlertTriangle size={22} />
                    </div>
                    <h3>{c.shift.after.title}</h3>
                    <p>{c.shift.after.text}</p>
                    <span className="lp-cmp__meta">{c.shift.after.meta}</span>
                  </div>
                </div>
              </Reveal>
            </div>

            <div className="lp-flowhead">
              <span className="lp-kicker">{c.workflow.kicker}</span>
            </div>
            <div className="lp-flow">
              {c.workflow.steps.map((step, i) => {
                const Icon = FLOW_ICONS[i] ?? Eye
                return (
                  <Reveal key={step.title} className="lp-step" delay={i * 0.06}>
                    <span className="lp-step__n">{String(i + 1).padStart(2, '0')}</span>
                    <h3>
                      <Icon size={18} /> {step.title}
                    </h3>
                    <p>{step.text}</p>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── возможности ──────────────────────────────────────────── */}
        <section className="lp-section" id="capabilities">
          <div className="lp-container">
            <Reveal className="lp-secthead">
              <div>
                <div className="lp-kicker">{c.capabilities.kicker}</div>
                <h2 className="lp-h2">
                  {c.capabilities.titleA} <em>{c.capabilities.titleEm}</em>
                </h2>
              </div>
              <p>{c.capabilities.lede}</p>
            </Reveal>
            <ul className="lp-bento">
              {c.capabilities.items.map((item, i) => {
                const Icon = CAP_ICONS[i] ?? Sparkles
                const tile = BENTO[i] ?? { mod: '', text: false }
                const hero = tile.mod === 'lp-tile--hero'
                return (
                  <Reveal
                    as="li"
                    key={item.title}
                    className={`lp-tile ${tile.mod}`}
                    delay={(i % 3) * 0.05}
                  >
                    <span className="lp-tile__icon">
                      <Icon size={hero ? 26 : 22} />
                    </span>
                    {/* крупная плитка показывает сам продукт в работе:
                        вопрос обычными словами и ответ с доказательством */}
                    {hero && (
                      <div className="lp-ask">
                        <p className="lp-ask__q">{c.capabilities.askSample}</p>
                        <p className="lp-ask__a">
                          <FileVideo size={15} />
                          {c.capabilities.askReply}
                        </p>
                      </div>
                    )}
                    <div className="lp-tile__copy">
                      <h3>{item.title}</h3>
                      {tile.text && <p>{item.text}</p>}
                    </div>
                  </Reveal>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ── панель ───────────────────────────────────────────────── */}
        <section className="lp-section" id="product">
          <div className="lp-container">
            <Reveal className="lp-secthead">
              <div>
                <div className="lp-kicker">{c.product.kicker}</div>
                <h2 className="lp-h2">
                  {c.product.titleA} <em>{c.product.titleEm}</em>
                </h2>
              </div>
              <p>{c.product.lede}</p>
            </Reveal>
            <Reveal>
              <ShotFrame src={SHOT_OVERVIEW} alt={c.product.shots[0].title} />
            </Reveal>
            <Reveal className="lp-shots__caps" delay={0.06}>
              {c.product.shots.map((shot) => (
                <div key={shot.title}>
                  <h3>{shot.title}</h3>
                  <p>{shot.text}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ── отрасли ──────────────────────────────────────────────── */}
        <section className="lp-section lp-section--tight" id="industries">
          <div className="lp-container">
            <Reveal className="lp-secthead">
              <div>
                <div className="lp-kicker">{c.industries.kicker}</div>
                <h2 className="lp-h2">
                  {c.industries.titleA} <em>{c.industries.titleEm}</em>
                </h2>
              </div>
              <p>{c.industries.lede}</p>
            </Reveal>
            <div className="lp-ind">
              {c.industries.items.map((item, i) => {
                const Icon = IND_ICONS[i] ?? Package
                return (
                  <Reveal key={item.label} className="lp-ind__card" delay={i * 0.06}>
                    <span className="lp-ind__label">{item.label}</span>
                    <span className="lp-ind__glyph" aria-hidden="true">
                      <Icon size={26} />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── что происходит с записью ─────────────────────────────── */}
        {/* Раньше здесь стояло «данные не покидают объект» — это неправда:
            устройство на объекте только собирает поток, обработка и хранение
            идут на сервере Pragmata. Схема показывает маршрут как есть. */}
        <section className="lp-section" id="privacy">
          <div className="lp-container">
            <Reveal className="lp-priv__copy">
              <div className="lp-kicker">{c.privacy.kicker}</div>
              <h2 className="lp-h2">
                {c.privacy.titleA} <em>{c.privacy.titleEm}</em>
              </h2>
              <p className="lp-priv__text">{c.privacy.text}</p>
            </Reveal>

            <Reveal className="lp-loop" delay={0.08}>
              <div className="lp-loop__site">
                <span className="lp-loop__edge">{c.diagram.siteLabel}</span>
                <div className="lp-loop__nodes">
                  <div className="lp-loop__node">
                    <Camera size={18} />
                    <span>
                      {c.diagram.cameras}
                      <small>{c.diagram.camerasMeta}</small>
                    </span>
                  </div>
                  <span className="lp-loop__link" aria-hidden="true" />
                  <div className="lp-loop__node">
                    <Cpu size={18} />
                    <span>
                      {c.diagram.device}
                      <small>{c.diagram.deviceMeta}</small>
                    </span>
                  </div>
                </div>
              </div>

              <span className="lp-loop__wire" aria-hidden="true" />

              <div className="lp-loop__node lp-loop__node--core">
                <Server size={18} />
                <span>
                  {c.diagram.serverTitle}
                  <small>{c.diagram.serverMeta}</small>
                </span>
              </div>

              <span className="lp-loop__wire" aria-hidden="true" />

              <div className="lp-loop__node">
                <MessageCircle size={18} />
                <span>
                  {c.diagram.outTitle}
                  <small>{c.diagram.outMeta}</small>
                </span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── финальный призыв ─────────────────────────────────────── */}
        {/* По центру он ломал логику страницы (всё остальное набрано от левого
            края), а половина заголовка серым читалась как выключенная. */}
        <section className="lp-cta">
          <div className="lp-container lp-cta__inner">
            <Reveal>
              <div className="lp-kicker">{c.finalCta.kicker}</div>
              <h2 className="lp-h2">
                {c.finalCta.titleA} {c.finalCta.titleEm}
              </h2>
              <p>{c.finalCta.text}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <button
                type="button"
                className="lp-btn lp-btn--primary"
                onClick={() => setDialogOpen(true)}
              >
                {c.finalCta.button}
                <ArrowUpRight size={16} />
              </button>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lp-foot">
        <div className="lp-container lp-foot__inner">
          <Logo label={c.a11y.home} />
          <span>{c.footer.tagline}</span>
          <div className="lp-foot__links">
            <a href="#capabilities">{c.nav.capabilities}</a>
            <a href="#privacy">{c.nav.privacy}</a>
            <button type="button" onClick={() => setDialogOpen(true)}>
              {c.footer.contact}
            </button>
            <Link to="/login">{c.footer.login}</Link>
            <span className="lp-foot__copy">{c.footer.copyright}</span>
          </div>
        </div>
      </footer>

      {dialogOpen && (
        <Modal onClose={() => setDialogOpen(false)}>
          <div className="lp-dlg">
            <h2>
              {c.modal.titleA} {c.modal.titleEm}
            </h2>
            <p>{c.modal.text}</p>
            <div className="lp-dlg__fields">
              <div>
                <label htmlFor="lp-site">{c.modal.siteLabel}</label>
                <select id="lp-site" defaultValue={c.modal.siteOptions[0]}>
                  {c.modal.siteOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lp-cams">{c.modal.camLabel}</label>
                <select id="lp-cams" defaultValue={c.modal.camOptions[0]}>
                  {c.modal.camOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              className="lp-btn lp-btn--primary lp-dlg__submit"
              onClick={() => {
                window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(c.modal.subject)}`
              }}
            >
              {c.modal.submit}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
