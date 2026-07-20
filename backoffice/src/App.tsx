import { useState } from 'react'
import { LayoutDashboard, LogOut, Moon, Settings2, Sun, Users } from 'lucide-react'
import { session } from './api'
import { LogoMark } from './logo'
import { Login } from './pages/Login'
import { Overview } from './pages/Overview'
import { Settings } from './pages/Settings'
import { Access } from './pages/Access'

type Tab = 'overview' | 'access' | 'settings'
const NAV: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { key: 'access', label: 'Доступ', icon: Users },
  { key: 'settings', label: 'Настройки', icon: Settings2 },
]

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
  const title = NAV.find((n) => n.key === tab)?.label ?? ''

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border-default bg-surface">
        <div className="flex h-16 items-center px-5">
          <LogoMark size={24} className="text-brand-mark" />
          <span className="ml-2 text-h4 font-bold">Бэкофис</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((n) => {
            const Icon = n.icon
            const active = tab === n.key
            return (
              <button
                key={n.key}
                onClick={() => setTab(n.key)}
                className={
                  'flex items-center gap-3 rounded-button px-3 py-2.5 text-body font-medium transition-colors ' +
                  (active
                    ? 'bg-brand-10 text-brand'
                    : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary')
                }
              >
                <Icon size={18} /> {n.label}
              </button>
            )
          })}
        </nav>
        <div className="p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-body font-medium text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
          >
            <LogOut size={18} /> Выйти
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-default bg-surface px-6">
          <h1 className="text-h3 font-semibold">{title}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-button text-text-secondary hover:bg-bg-secondary"
              title="Тема"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="text-label text-text-secondary">{session.username()}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' && <Overview />}
          {tab === 'access' && <Access />}
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
