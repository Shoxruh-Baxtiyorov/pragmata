import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authActions } from '@/features/auth'
import { setLang } from '@/shared/i18n'

const links = [
  { to: '/live', key: 'nav.live' },
  { to: '/events', key: 'nav.events' },
  { to: '/stats', key: 'nav.stats' },
  { to: '/search', key: 'nav.search' },
]

export function AppLayout() {
  const { t, i18n } = useTranslation()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="font-semibold">{t('app.title')}</span>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                    isActive
                      ? 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => setLang(i18n.language === 'ru' ? 'uz' : 'ru')}
            className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            {i18n.language === 'ru' ? 'UZ' : 'RU'}
          </button>
          <button
            onClick={() => authActions.logout()}
            className="rounded-md px-2 py-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-alert)]"
          >
            {t('nav.logout')}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
