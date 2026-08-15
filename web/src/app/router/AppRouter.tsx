import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { Spinner } from '@/shared/ui'
import { LoginPage, useIsAdmin, useIsAuthed } from '@/features/auth'
import { UsersPage } from '@/features/users'
import { SecurityPage } from '@/features/security'
import { ArchivePage } from '@/features/archive'
import { AssistantPage } from '@/features/assistant'
import { LivePage } from '@/features/live'
import { EventsPage } from '@/features/events'
import { SearchPage } from '@/features/search'
import { SystemPage } from '@/features/system'
import { ManagePage } from '@/features/manage'
import { WatchlistPage } from '@/features/watchlist'
import { AnalyticsPage } from '@/features/analytics'
import { JournalPage } from '@/features/journal'
import { HeatmapPage } from '@/features/heatmap'
import { TurnstilesPage } from '@/features/turnstiles'
import { BackofficePage } from '@/features/backoffice'
import { SettingsPage } from '@/features/settings'

// Единственные две страницы с графиками. recharts со своим деревом зависимостей
// весит ~330 КБ gzip и до этого попадал в общий бандл — его тянул даже экран
// входа. Грузим их отдельным чанком по факту перехода.
const OverviewPage = lazy(() =>
  import('@/features/overview').then((m) => ({ default: m.OverviewPage })),
)
const StatsPage = lazy(() => import('@/features/insights').then((m) => ({ default: m.StatsPage })))

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

// Гейт авторизации — одна развилка на верхнем уровне, не per-route guards
export function AppRouter() {
  const authed = useIsAuthed()
  const isAdmin = useIsAdmin()
  if (!authed) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/overview"
          element={
            <LazyPage>
              <OverviewPage />
            </LazyPage>
          }
        />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/turnstiles" element={<TurnstilesPage />} />
        <Route path="/backoffice" element={<BackofficePage />} />
        <Route
          path="/stats"
          element={
            <LazyPage>
              <StatsPage />
            </LazyPage>
          }
        />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/system" element={<SystemPage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/security" element={<SecurityPage />} />
        {isAdmin && <Route path="/users" element={<UsersPage />} />}
        {isAdmin && <Route path="/settings" element={<SettingsPage />} />}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  )
}
