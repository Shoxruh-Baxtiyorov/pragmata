import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authActions } from '@/features/auth'
import { setLang } from '@/shared/i18n'
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from '@/shared/ui/icons'

const nav: { to: string; key: string; icon: LucideIcon }[] = [
  { to: '/overview', key: 'nav.overview', icon: LayoutDashboard },
  { to: '/assistant', key: 'nav.assistant', icon: Sparkles },
  { to: '/live', key: 'nav.live', icon: MonitorPlay },
  { to: '/events', key: 'nav.events', icon: ShieldAlert },
  { to: '/stats', key: 'nav.stats', icon: BarChart3 },
  { to: '/search', key: 'nav.search', icon: Search },
  { to: '/watchlist', key: 'nav.watchlist', icon: Bell },
  { to: '/manage', key: 'nav.manage', icon: Settings2 },
  { to: '/system', key: 'nav.system', icon: Settings },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-500)] text-white">
          <ShieldAlert size={18} />
        </span>
        <div className="leading-tight">
          <p className="font-bold tracking-tight">Soqchi AI</p>
          <p className="text-[11px] text-[var(--color-text-subtle)]">Security Copilot</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {nav.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
                  : 'text-[var(--color-text-2)] hover:bg-[var(--color-muted-bg)]'
              }`
            }
          >
            <l.icon size={18} />
            {t(l.key)}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const loc = useLocation()
  const [drawer, setDrawer] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* десктоп-сайдбар */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-[var(--color-border-soft)] bg-white lg:flex">
        <SidebarContent />
      </aside>

      {/* мобильный drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside
            className="absolute left-0 top-0 flex h-full w-60 flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--color-border-soft)] bg-white/80 px-4 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-[var(--color-text-2)]">
            {t(nav.find((n) => loc.pathname.startsWith(n.to))?.key ?? 'nav.overview')}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setLang(i18n.language === 'ru' ? 'uz' : 'ru')}
            className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-2)] hover:bg-[var(--color-muted-bg)]"
          >
            {i18n.language === 'ru' ? 'UZ' : 'RU'}
          </button>
          <button
            onClick={() => authActions.logout()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t('nav.logout')}</span>
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
