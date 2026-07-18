import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { setOnUnauthorized } from '@/shared/api/client'
import { authActions } from '@/features/auth'

// 401 из api-клиента → logout + redirect на /login
function UnauthorizedBridge() {
  const nav = useNavigate()
  useEffect(() => {
    setOnUnauthorized(() => {
      authActions.logout()
      nav('/login')
    })
  }, [nav])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 2000 } } }),
  )
  return (
    <QueryClientProvider client={client}>
      <UnauthorizedBridge />
      {children}
    </QueryClientProvider>
  )
}
