/**
 * Оболочка операторского фронта Pragmata — дизайн-язык iqbola (shadcn + токены).
 * Сайдбар 250px, сворачивается в 78px (состояние в localStorage); на мобильном —
 * выезжающий drawer. Нав-группы, футер с выбором языка/организации, темой и
 * карточкой роли. Домен — наш (мониторинг камер).
 */
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Archive,
  CalendarClock,
  Camera,
  ClipboardList,
  CreditCard,
  DoorOpen,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  RadioTower,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TrendingUp,
  UserCog,
  Users,
  X,
  type IconComponent,
} from '@/shared/ds/icons'
import { IconButton } from '@/shared/ds'
import { LangSelect, SiteSelect } from '@/shared/ui'
import { Logo, LogoMark } from '@/shared/ui/Logo'
import { cn } from '@/shared/lib/utils'
import { useTheme } from '@/shared/hooks/useTheme'
import { authActions, useCanManage, useEntitlements, useIsAdmin, useUsername } from '@/features/auth'

// feature — ключ раздела в правах подписки (analytics.entitlements). Нет ключа =
// ядро, доступно всегда. Есть ключ — прячем раздел, если тариф его не открывает.
// backoffice — раздел владельца платформы (admin + allowlist BACKOFFICE_USERS).
type NavItem = {
  to: string
  key: string
  icon: IconComponent
  admin?: boolean
  feature?: string
  backoffice?: boolean
}
const NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  { items: [{ to: '/overview', key: 'nav.overview', icon: LayoutDashboard }] },
  {
    label: 'navGroup.monitoring',
    items: [
      { to: '/live', key: 'nav.live', icon: RadioTower },
      { to: '/events', key: 'nav.events', icon: ShieldAlert },
      { to: '/journal', key: 'nav.journal', icon: ClipboardList, feature: 'journal' },
      { to: '/heatmap', key: 'nav.heatmap', icon: LayoutGrid, feature: 'heatmap' },
      { to: '/stats', key: 'nav.stats', icon: TrendingUp, feature: 'stats' },
    ],
  },
  {
    label: 'navGroup.investigate',
    items: [
      { to: '/assistant', key: 'nav.assistant', icon: Sparkles, feature: 'assistant' },
      { to: '/search', key: 'nav.search', icon: Search, feature: 'search' },
      { to: '/archive', key: 'nav.archive', icon: Archive, feature: 'archive' },
      { to: '/watchlist', key: 'nav.watchlist', icon: Users, feature: 'watchlist' },
    ],
  },
  {
    label: 'navGroup.admin',
    items: [
      { to: '/manage', key: 'nav.manage', icon: Camera },
      { to: '/turnstiles', key: 'nav.turnstiles', icon: DoorOpen, feature: 'turnstile' },
      { to: '/analytics', key: 'nav.analytics', icon: SlidersHorizontal },
      { to: '/system', key: 'nav.system', icon: Settings },
      { to: '/settings', key: 'nav.settings', icon: CalendarClock, admin: true },
      { to: '/users', key: 'nav.users', icon: UserCog, admin: true },
      { to: '/security', key: 'nav.security', icon: ShieldCheck },
      { to: '/backoffice', key: 'nav.backoffice', icon: CreditCard, backoffice: true },
    ],
  },
]

const SIDE_KEY = 'pragmata_side'
const AVATAR_GRADIENT =
  'bg-[linear-gradient(135deg,var(--color-brand-400),var(--color-brand-700))]'

export function AppLayout() {
  const { t } = useTranslation()
  const [theme, toggleTheme] = useTheme()
  const [open, setOpen] = useState(false) // мобильный drawer
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDE_KEY) === '1')
  const isAdmin = useIsAdmin()
  const username = useUsername()
  const ent = useEntitlements()
  const canManage = useCanManage()

  const toggleSide = () =>
    setCollapsed((c) => {
      localStorage.setItem(SIDE_KEY, c ? '0' : '1')
      return !c
    })

  const initial = (username || '?').slice(0, 1).toUpperCase()

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2.5 rounded-[12px] px-3 py-[11px] text-[13px] font-medium',
      'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',
      collapsed && 'lg:justify-center lg:px-0',
      isActive &&
        'bg-[var(--color-brand-50)] font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-text)]',
    )

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-app)]">
      {open && (
        <button
          aria-label={t('common.close')}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col',
          'border-r border-[var(--color-border-soft)] bg-[var(--color-bg-surface)]',
          'transition-[width,transform] duration-200 will-change-transform',
          'lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-[250px] lg:w-[78px]' : 'w-[250px]',
        )}
      >
        {/* шапка: логотип + сворачивание */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-4 py-4',
            collapsed && 'lg:flex-col lg:gap-3 lg:px-0',
          )}
        >
          <div className={cn('min-w-0 flex-1 leading-tight', collapsed && 'lg:hidden')}>
            <Logo size={22} />
          </div>
          {collapsed && <LogoMark size={28} className="hidden lg:block" />}
          <IconButton
            aria-label={t('common.close')}
            size={32}
            onClick={() => setOpen(false)}
            className="lg:hidden"
          >
            <X size={18} />
          </IconButton>
          <IconButton
            aria-label="collapse"
            size={32}
            onClick={toggleSide}
            className="hidden lg:inline-flex"
          >
            <Menu size={18} />
          </IconButton>
        </div>

        {/* навигация */}
        <nav className={cn('flex-1 overflow-y-auto px-3 pb-3', collapsed && 'lg:px-2')}>
          {NAV_GROUPS.map((group, gi) => {
            const items = group.items.filter(
              (it) =>
                (!it.admin || isAdmin) &&
                (!it.backoffice || canManage) &&
                (ent.all || !it.feature || ent.features.includes(it.feature)),
            )
            if (items.length === 0) return null
            return (
              <div key={gi}>
                {group.label ? (
                  <div
                    className={cn(
                      'px-3 pb-1 pt-4 text-[9.5px] font-bold tracking-[1.3px] text-[var(--color-text-muted)]',
                      collapsed && 'lg:hidden',
                    )}
                  >
                    {t(group.label)}
                  </div>
                ) : (
                  <div className="pt-1" />
                )}
                {group.label && collapsed && <div className="hidden pt-4 lg:block" />}
                <div className="flex flex-col gap-0.5">
                  {items.map(({ to, key, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      title={collapsed ? t(key) : undefined}
                      className={navItemClass}
                      onClick={() => setOpen(false)}
                    >
                      <Icon size={18} />
                      <span className={cn('truncate', collapsed && 'lg:hidden')}>{t(key)}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* футер: язык + организация + тема + роль */}
        <div className="flex flex-col gap-2 border-t border-[var(--color-border-soft)] p-3">
          {!collapsed && (
            <div className="flex flex-col gap-2">
              <SiteSelect />
              <LangSelect />
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              'flex items-center gap-2.5 rounded-[12px] px-3 py-[11px] text-[13px] font-medium',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',
              collapsed && 'lg:justify-center lg:px-0',
            )}
            title={theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className={cn(collapsed && 'lg:hidden')}>
              {theme === 'dark' ? t('common.themeLight') : t('common.themeDark')}
            </span>
          </button>

          <div
            className={cn(
              'flex items-center gap-2.5 rounded-[12px] bg-[var(--color-bg-muted)] p-2.5',
              collapsed && 'lg:flex-col lg:gap-2 lg:p-2',
            )}
          >
            <div
              className={cn(
                'flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white',
                AVATAR_GRADIENT,
              )}
            >
              {initial}
            </div>
            {username && (
              <div className={cn('min-w-0 flex-1 leading-tight', collapsed && 'lg:hidden')}>
                <div className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                  {username}
                </div>
                <div className="text-[10px] font-bold text-[var(--color-brand-text)]">
                  {isAdmin ? t('users.roleAdmin') : t('users.roleUser')}
                </div>
              </div>
            )}
            <IconButton
              aria-label={t('common.logout')}
              size={28}
              onClick={() => authActions.logout()}
            >
              <LogOut size={15} />
            </IconButton>
          </div>
        </div>
      </aside>

      {/* контент */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* мобильная шапка (только < lg) */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] px-4 lg:hidden">
          <IconButton aria-label={t('nav.overview')} size={36} onClick={() => setOpen(true)}>
            <Menu size={20} />
          </IconButton>
          <Logo size={20} />
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
