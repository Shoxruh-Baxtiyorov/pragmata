import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, useIsAuthed } from '@/features/auth'
import { LivePage } from '@/features/live'
import { EventsPage } from '@/features/events'
import { StatsPage } from '@/features/insights'
import { SearchPage } from '@/features/search'
import { AppLayout } from '@/app/layout/AppLayout'

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
        <Route path="/live" element={<LivePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/live" replace />} />
      </Route>
    </Routes>
  )
}
