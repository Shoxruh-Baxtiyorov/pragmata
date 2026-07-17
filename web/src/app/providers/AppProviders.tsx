import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { setUnauthorizedHandler } from '@/shared/api/client'
import { authActions } from '@/features/auth'

function UnauthorizedBridge() {
  const nav = useNavigate()
  useEffect(() => {
    setUnauthorizedHandler(() => {
      authActions.logout()
      nav('/login')
    })
  }, [nav])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 2000 } },
      }),
  )
  return (
    <QueryClientProvider client={qc}>
      <UnauthorizedBridge />
      {children}
    </QueryClientProvider>
  )
}
