import { useState } from 'react'
import {
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Moon,
  ScrollText,
  Settings2,
  Sun,
  UserRound,
  Users,
  Video,
} from 'lucide-react'
import { session } from './api'
import { LogoMark } from './logo'
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { Settings } from './pages/Settings'
import { Access } from './pages/Access'
import { Audit } from './pages/Audit'
import { Cameras } from './pages/Cameras'
import { Persons } from './pages/Persons'
import { Archive } from './pages/Archive'

type Tab = 'overview' | 'cameras' | 'persons' | 'archive' | 'access' | 'audit' | 'settings'

const NAV: { group: string; items: { key: Tab; label: string; icon: typeof Users }[] }[] = [
  {
    group: 'Объект',
    items: [
      { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
      { key: 'cameras', label: 'Камеры', icon: Video },
      { key: 'persons', label: 'Люди', icon: UserRound },
      { key: 'archive', label: 'Архив', icon: Clapperboard },
    ],
  },
  {
    group: 'Администрирование',
    items: [
      { key: 'access', label: 'Доступ', icon: Users },
      { key: 'audit', label: 'Журнал', icon: ScrollText },
      { key: 'settings', label: 'Настройки', icon: Settings2 },
    ],
  },
]

const TITLES: Record<Tab, { title: string; hint: string }> = {
  overview: { title: 'Обзор', hint: 'Состояние объекта одним экраном' },
  cameras: { title: 'Камеры', hint: 'Источники видео и их зоны' },
  persons: { title: 'Люди', hint: 'Реестр лиц: сотрудники, гости, наблюдение' },
  archive: { title: 'Архив', hint: 'Ретро-анализ старых записей' },
  access: { title: 'Доступ', hint: 'Пользователи, роли, восстановление входа' },
  audit: { title: 'Журнал', hint: 'Кто что менял и выгружал' },
  settings: { title: 'Настройки', hint: 'Объект, рабочие часы, дайджест' },
}

function useTheme() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  )
  const toggle = () => {
    const next = !dark
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    setDark(next)
  }
  return { dark, toggle }
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const { dark, toggle } = useTheme()
  const meta = TITLES[tab]

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border-default bg-surface">
        <div className="flex items-center gap-3 border-b border-border-default px-5 py-4">
          <span className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-brand-hi to-brand text-on-brand shadow-brand">
            <LogoMark size={20} />
          </span>
          <span className="leading-tight">
            <span className="block text-label font-extrabold tracking-tight">Pragmata AI</span>
            <span className="block text-caption text-text-placeholder">Бэкофис · v1.0</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((g) => (
            <div key={g.group} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-caption font-bold uppercase tracking-wider text-text-placeholder">
                {g.group}
              </p>
              {g.items.map((n) => {
                const Icon = n.icon
                const active = tab === n.key
                return (
                  <button
                    key={n.key}
                    onClick={() => setTab(n.key)}
                    className={
                      'mb-0.5 flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-label font-semibold transition-colors ' +
                      (active
                        ? 'bg-brand-10 text-brand'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-brand')
                    }
                  >
                    <Icon size={17} className={active ? '' : 'text-text-placeholder'} />
                    {n.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border-default p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-label font-semibold text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
          >
            <LogOut size={17} /> Выйти
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border-default bg-surface px-7 py-3.5">
          <div className="min-w-0">
            <h1 className="truncate text-h3">{meta.title}</h1>
            <p className="truncate text-caption text-text-placeholder">{meta.hint}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-[9px] text-text-secondary transition-colors hover:bg-bg-secondary"
              title="Тема"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className="flex items-center gap-2 rounded-pill bg-bg-secondary py-1 pl-1 pr-3">
              <span className="grid h-7 w-7 place-items-center rounded-pill bg-gradient-to-br from-brand-hi to-brand text-caption font-bold text-on-brand">
                {session.username().slice(0, 1).toUpperCase()}
              </span>
              <span className="text-label font-semibold">{session.username()}</span>
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-7">
          {tab === 'overview' && <Overview />}
          {tab === 'cameras' && <Cameras />}
          {tab === 'persons' && <Persons />}
          {tab === 'archive' && <Archive />}
          {tab === 'access' && <Access />}
          {tab === 'audit' && <Audit />}
          {tab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

export function App() {
  const [authed, setAuthed] = useState(() => !!session.token())

  if (!authed) return <Login onLogin={() => setAuthed(true)} />
  return (
    <Shell
      onLogout={() => {
        session.clear()
        setAuthed(false)
      }}
    />
  )
}
