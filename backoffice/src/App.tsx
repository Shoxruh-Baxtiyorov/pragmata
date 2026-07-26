import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/guards'
import { AppShell } from '@/components/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { TenantsPage } from '@/pages/TenantsPage'
import { PlansPage } from '@/pages/PlansPage'
import { UsersPage } from '@/pages/UsersPage'
import { CamerasPage } from '@/pages/CamerasPage'
import { PersonsPage } from '@/pages/PersonsPage'
import { AuditPage } from '@/pages/AuditPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ArchivePage } from '@/pages/ArchivePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/persons" element={<PersonsPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
