import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bot,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  TrendingUp,
  UserCog,
  Users,
  Video,
  type LucideIcon,
} from '@/shared/ui/icons'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { setLang } from '@/shared/i18n'
import { useTheme } from '@/shared/hooks/useTheme'
import { authActions, useIsAdmin, useUsername } from '@/features/auth'

// Порядок переключения языков по клику: uz → ru → en → uz
const NEXT_LANG: Record<'ru' | 'uz' | 'en', 'ru' | 'uz' | 'en'> = {
  uz: 'ru',
  ru: 'en',
  en: 'uz',
}

const NAV: { to: string; key: string; icon: LucideIcon; admin?: boolean }[] = [
  { to: '/overview', key: 'nav.overview', icon: LayoutDashboard },
  { to: '/assistant', key: 'nav.assistant', icon: Bot },
  { to: '/live', key: 'nav.live', icon: Video },
  { to: '/events', key: 'nav.events', icon: ShieldAlert },
  { to: '/stats', key: 'nav.stats', icon: TrendingUp },
  { to: '/search', key: 'nav.search', icon: Search },
  { to: '/system', key: 'nav.system', icon: Settings },
  { to: '/manage', key: 'nav.manage', icon: Video },
  { to: '/watchlist', key: 'nav.watchlist', icon: Users },
  { to: '/security', key: 'nav.security', icon: ShieldCheck },
  { to: '/users', key: 'nav.users', icon: UserCog, admin: true },
]

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const [theme, toggleTheme] = useTheme()
  const isAdmin = useIsAdmin()
  const username = useUsername()
  const nextLang = NEXT_LANG[i18n.language as keyof typeof NEXT_LANG] ?? 'uz'
  const nav = NAV.filter((item) => !item.admin || isAdmin)
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-border-default bg-surface p-4">
        <div className="mb-6 px-2 text-h3 text-brand">Pragmata AI</div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-3 rounded-button px-3 text-body font-medium',
                  isActive
                    ? 'bg-brand-10 text-brand'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
                )
              }
            >
              <Icon size={20} />
              {t(key)}
            </NavLink>
          ))}
        </nav>
        {username && (
          <div className="mb-2 flex items-center gap-2 px-2 text-label text-text-secondary">
            <UserCog size={16} />
            <span className="min-w-0 flex-1 truncate" title={username}>
              {username}
            </span>
            {isAdmin && <span className="text-brand">{t('users.roleAdmin')}</span>}
          </div>
        )}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLang(nextLang)}>
            {nextLang.toUpperCase()}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => authActions.logout()}
            aria-label={t('common.logout')}
          >
            <LogOut size={20} />
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
