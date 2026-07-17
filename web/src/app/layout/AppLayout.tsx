import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authActions } from '@/features/auth'
import { setLang } from '@/shared/i18n'
import { BarChart3, LogOut, MonitorPlay, Search, ShieldAlert, type LucideIcon } from '@/shared/ui/icons'

const links: { to: string; key: string; icon: LucideIcon }[] = [
  { to: '/live', key: 'nav.live', icon: MonitorPlay },
  { to: '/events', key: 'nav.events', icon: ShieldAlert },
  { to: '/stats', key: 'nav.stats', icon: BarChart3 },
  { to: '/search', key: 'nav.search', icon: Search },
]

export function AppLayout() {
  const { t, i18n } = useTranslation()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 pr-2">
            <ShieldAlert size={20} className="text-[var(--color-accent)]" />
            <span className="font-semibold tracking-tight">Soqchi AI</span>
          </div>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ${
                    isActive
                      ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]/50 hover:text-[var(--color-text)]'
                  }`
                }
              >
                <l.icon size={16} />
                <span className="hidden sm:inline">{t(l.key)}</span>
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => setLang(i18n.language === 'ru' ? 'uz' : 'ru')}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            {i18n.language === 'ru' ? 'UZ' : 'RU'}
          </button>
          <button
            onClick={() => authActions.logout()}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-alert)]"
            title={t('nav.logout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
