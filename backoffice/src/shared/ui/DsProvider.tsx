import type { ReactNode } from 'react'

import { TooltipProvider } from '@/shared/ui/tooltip'
import { Toaster } from '@/shared/ui/sonner'

/**
 * Mount once inside the app shell so shadcn tooltips and Sonner toasts work.
 */
export function DsProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </TooltipProvider>
  )
}
