import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/layout/AppLayout'
import { LoginPage, useIsAuthed } from '@/features/auth'
import { OverviewPage } from '@/features/overview'
import { AssistantPage } from '@/features/assistant'
import { LivePage } from '@/features/live'
import { EventsPage } from '@/features/events'
import { StatsPage } from '@/features/insights'
import { SearchPage } from '@/features/search'
import { SystemPage } from '@/features/system'

// Гейт авторизации — одна развилка на верхнем уровне, не per-route guards
export function AppRouter() {
  const authed = useIsAuthed()
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
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  )
}
