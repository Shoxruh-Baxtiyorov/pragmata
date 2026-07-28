/**
 * Оболочка бэкофиса Pragmata — сайдбар 250px (сворачивается в 78px, состояние в
 * localStorage), нав-группы, карточка роли с переключателем темы и выходом.
 * Дизайн-язык — из бэкофиса Iqbola (shadcn + токены), домен — наш.
 */
import { useCallback, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { IconButton } from '@/shared/ui'
import Logo, { LogoMark } from '@/shared/ui/Logo'
import {
  Archive,
  Building2,
  Camera,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Settings,
  Sun,
  User,
  type IconComponent,
} from '@/shared/ui/icons'
import { cn } from '@/shared/lib/utils'
import { useAuth } from '@/auth/AuthContext'

const THEME_KEY = 'pragmata_bo_theme'
type Theme = 'light' | 'dark'

function storedTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}
function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.setAttribute('data-color-scheme', theme)
}
if (typeof document !== 'undefined') applyTheme(storedTheme())

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(storedTheme)
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      applyTheme(next)
      return next
    })
  }, [])
  return [theme, toggle]
}

const SIDE_KEY = 'pragmata_bo_side'

interface NavItem {
  label: string
  to: string
  icon: IconComponent
  isActive: (pathname: string) => boolean
}
interface NavGroup {
  caption: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    caption: 'ОБЪЕКТ',
    items: [
      { label: 'Обзор', to: '/', icon: LayoutDashboard, isActive: (p) => p === '/' },
      { label: 'Камеры', to: '/cameras', icon: Camera, isActive: (p) => p.startsWith('/cameras') },
      { label: 'Люди', to: '/persons', icon: User, isActive: (p) => p.startsWith('/persons') },
      { label: 'Архив', to: '/archive', icon: Archive, isActive: (p) => p.startsWith('/archive') },
    ],
  },
  {
    caption: 'АРЕНДА',
    items: [
      {
        label: 'Организации',
        to: '/tenants',
        icon: Building2,
        isActive: (p) => p.startsWith('/tenants'),
      },
      { label: 'Тарифы', to: '/plans', icon: Layers, isActive: (p) => p.startsWith('/plans') },
    ],
  },
  {
    caption: 'АДМИНИСТРИРОВАНИЕ',
    items: [
      {
        label: 'Администраторы',
        to: '/users',
        icon: KeyRound,
        isActive: (p) => p.startsWith('/users'),
      },
      { label: 'Журнал', to: '/audit', icon: ScrollText, isActive: (p) => p.startsWith('/audit') },
      {
        label: 'Настройки',
        to: '/settings',
        icon: Settings,
        isActive: (p) => p.startsWith('/settings'),
      },
    ],
  },
]

const AVATAR_GRADIENT = 'bg-[linear-gradient(135deg,var(--color-brand-400),var(--color-brand-700))]'

export function AppShell() {
  const { me, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDE_KEY) === '1')
  const [theme, toggleTheme] = useTheme()

  const toggleSide = () =>
    setCollapsed((c) => {
      localStorage.setItem(SIDE_KEY, c ? '0' : '1')
      return !c
    })

  const handleSignOut = () => {
    signOut()
    navigate('/login', { replace: true })
  }

  const initial = (me?.username || '?').slice(0, 1).toUpperCase()

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-app)]">
      <aside
        className={cn(
          'sticky top-0 flex h-screen shrink-0 flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-bg-surface)]',
          'transition-[width] duration-200',
          collapsed ? 'w-[78px]' : 'w-[250px]',
        )}
      >
        <div className={cn('flex items-center gap-2.5 px-4 py-4', collapsed && 'flex-col gap-3 px-0')}>
          {collapsed ? (
            <LogoMark size={28} />
          ) : (
            <div className="min-w-0 flex-1 leading-tight">
              <Logo size={22} />
              <div className="mt-1 text-[8.5px] font-bold tracking-[1.5px] text-[var(--color-text-muted)]">
                БЭКОФИС
              </div>
            </div>
          )}
          <IconButton aria-label="Свернуть панель" size={32} onClick={toggleSide}>
            <Menu size={18} />
          </IconButton>
        </div>

        <nav className={cn('flex-1 overflow-y-auto px-3 pb-3', collapsed && 'px-2')}>
          {NAV.map((group) => (
            <div key={group.caption}>
              {!collapsed && (
                <div className="px-3 pb-1 pt-4 text-[9.5px] font-bold tracking-[1.3px] text-[var(--color-text-muted)]">
                  {group.caption}
                </div>
              )}
              {collapsed && <div className="pt-4" />}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item.isActive(location.pathname)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-[12px] px-3 py-[11px] text-[13px] font-medium',
                        'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',
                        collapsed && 'justify-center px-0',
                        active &&
                          'bg-[var(--color-brand-50)] font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-text)]',
                      )}
                    >
                      <Icon size={18} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-[var(--color-border-soft)] p-3">
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              'flex items-center gap-2.5 rounded-[12px] px-3 py-[11px] text-[13px] font-medium',
              'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',
              collapsed && 'justify-center px-0',
            )}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>}
          </button>

          <div
            className={cn(
              'flex items-center gap-2.5 rounded-[12px] bg-[var(--color-bg-muted)] p-2.5',
              collapsed && 'flex-col gap-2 p-2',
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
            {!collapsed && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[12px] font-semibold text-[var(--color-text-primary)]">
                  {me?.username}
                </div>
                <div className="text-[10px] font-bold text-[var(--color-brand-text)]">
                  {me?.role === 'admin' ? 'Владелец платформы' : 'Оператор'}
                </div>
              </div>
            )}
            <IconButton aria-label="Выйти" size={28} onClick={handleSignOut}>
              <LogOut size={15} />
            </IconButton>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-7 py-5">
        <Outlet />
      </main>
    </div>
  )
}
