import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { LoginPage, useIsAdmin, useIsAuthed } from '@/features/auth'
import { UsersPage } from '@/features/users'
import { SecurityPage } from '@/features/security'
import { ArchivePage } from '@/features/archive'
import { OverviewPage } from '@/features/overview'
import { AssistantPage } from '@/features/assistant'
import { LivePage } from '@/features/live'
import { EventsPage } from '@/features/events'
import { StatsPage } from '@/features/insights'
import { SearchPage } from '@/features/search'
import { SystemPage } from '@/features/system'
import { ManagePage } from '@/features/manage'
import { WatchlistPage } from '@/features/watchlist'

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
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/system" element={<SystemPage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/security" element={<SecurityPage />} />
        {isAdmin && <Route path="/users" element={<UsersPage />} />}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  )
}
