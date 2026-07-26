import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ResponsiveTable, type ResponsiveTableMode } from '@/shared/ui/responsive-table'

export interface DataTableFrameProps {
  title: string
  /** When true, thead stays visible inside scroll container on small viewports. */
  stickyHeader?: boolean
  /**
   * Responsive mode forwarded to <ResponsiveTable>.
   * "stack" (default) — rows become label→value cards on mobile (<768 px).
   * "scroll"           — horizontal scroll fallback (use for wide/complex tables).
   */
  responsiveMode?: ResponsiveTableMode
  /** Table or fragment with thead+tbody. */
  children: ReactNode
  className?: string
}

/**
 * One contract for ERP lists: card chrome + scroll + numeric alignment helper.
 * On mobile the inner table is wrapped with ResponsiveTable for readable stacking.
 */
export function DataTableFrame({
  title,
  stickyHeader,
  responsiveMode = 'stack',
  children,
  className,
}: DataTableFrameProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b border-[var(--color-border-soft)] px-4 py-3 sm:px-6">
        <CardTitle className="text-[length:var(--fs-15)] font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* On md+ keep the existing sticky-header + overflow behaviour. */}
        <div
          className={cn(
            'md:overflow-x-auto',
            stickyHeader &&
              'md:max-h-[min(70vh,560px)] md:overflow-y-auto [&_thead]:md:sticky [&_thead]:md:top-0 [&_thead]:md:z-[1] [&_thead]:md:bg-[var(--color-bg-surface)]',
          )}
        >
          <ResponsiveTable
            mode={responsiveMode}
            className={cn('nums', responsiveMode === 'scroll' && 'min-w-[640px]')}
          >
            {children}
          </ResponsiveTable>
        </div>
      </CardContent>
    </Card>
  )
}
