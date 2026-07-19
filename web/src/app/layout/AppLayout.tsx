import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bot,
  Camera,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Moon,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  TrendingUp,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from '@/shared/ui/icons'
import { Button } from '@/shared/ui'
import { Logo } from '@/shared/ui/Logo'
import { cn } from '@/shared/lib/utils'
import { setLang } from '@/shared/i18n'
import { useTheme } from '@/shared/hooks/useTheme'
import { authActions, useIsAdmin, useUsername } from '@/features/auth'

const NEXT_LANG: Record<'ru' | 'uz' | 'en', 'ru' | 'uz' | 'en'> = { uz: 'ru', ru: 'en', en: 'uz' }

type NavItem = { to: string; key: string; icon: LucideIcon; admin?: boolean }
// Сгруппировано по смыслу — «нормальный» сайдбар с секциями, а не плоский список
const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ to: '/overview', key: 'nav.overview', icon: LayoutDashboard }] },
  {
    label: 'navGroup.monitoring',
    items: [
      { to: '/live', key: 'nav.live', icon: MonitorPlay },
      { to: '/events', key: 'nav.events', icon: ShieldAlert },
      { to: '/stats', key: 'nav.stats', icon: TrendingUp },
    ],
  },
  {
    label: 'navGroup.investigate',
    items: [
      { to: '/assistant', key: 'nav.assistant', icon: Bot },
      { to: '/search', key: 'nav.search', icon: Search },
      { to: '/watchlist', key: 'nav.watchlist', icon: Users },
    ],
  },
  {
    label: 'navGroup.admin',
    items: [
      { to: '/manage', key: 'nav.manage', icon: Camera },
      { to: '/system', key: 'nav.system', icon: Settings },
      { to: '/users', key: 'nav.users', icon: UserCog, admin: true },
      { to: '/security', key: 'nav.security', icon: ShieldCheck },
    ],
  },
]

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const [theme, toggleTheme] = useTheme()
  const [open, setOpen] = useState(false) // мобильный drawer
  const isAdmin = useIsAdmin()
  const username = useUsername()
  const nextLang = NEXT_LANG[i18n.language as keyof typeof NEXT_LANG] ?? 'uz'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-10 items-center gap-3 rounded-button px-3 text-body font-medium transition-colors',
      isActive
        ? 'bg-brand-10 text-brand'
        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
    )

  return (
    <div className="flex min-h-screen">
      {open && (
        <button
          aria-label={t('common.close')}
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed z-30 flex h-screen w-64 flex-col border-r border-border-default bg-surface p-3 transition-transform',
          'lg:static lg:h-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <Logo size={24} />
          <button
            className="rounded-button p-1 text-text-secondary hover:bg-bg-secondary lg:hidden"
            aria-label={t('common.close')}
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto py-2">
          {NAV_GROUPS.map((group, gi) => {
            const items = group.items.filter((it) => !it.admin || isAdmin)
            if (items.length === 0) return null
            return (
              <div key={gi} className="flex flex-col gap-1">
                {group.label && (
                  <div className="px-3 pb-1 text-caption font-semibold uppercase tracking-wider text-text-placeholder">
                    {t(group.label)}
                  </div>
                )}
                {items.map(({ to, key, icon: Icon }) => (
                  <NavLink key={to} to={to} className={navLinkClass} onClick={() => setOpen(false)}>
                    <Icon size={19} />
                    {t(key)}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border-default bg-surface/90 px-4 backdrop-blur">
          <button
            className="rounded-button p-2 text-text-secondary hover:bg-bg-secondary lg:hidden"
            aria-label={t('nav.overview')}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Logo size={22} wordmark={false} className="lg:hidden" />

          <div className="flex-1" />

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLang(nextLang)}>
            {nextLang.toUpperCase()}
          </Button>

          {username && (
            <div className="ml-1 flex items-center gap-2 border-l border-border-default pl-3">
              <span className="grid size-8 place-items-center rounded-full bg-brand-10 text-caption font-bold uppercase text-brand">
                {username.slice(0, 1)}
              </span>
              <div className="hidden leading-tight sm:block">
                <div className="max-w-32 truncate text-label font-semibold text-text-primary">
                  {username}
                </div>
                <div className="text-caption text-text-secondary">
                  {isAdmin ? t('users.roleAdmin') : t('users.roleUser')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => authActions.logout()}
                aria-label={t('common.logout')}
              >
                <LogOut size={19} />
              </Button>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
