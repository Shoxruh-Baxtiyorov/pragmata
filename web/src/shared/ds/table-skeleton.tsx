import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from './skeleton'
import { Table, TableBody, TableCell, TableRow } from './table'
import { cn } from '@/shared/ds/utils'

export interface TableSkeletonProps {
  columns: number
  rows?: number
  caption?: ReactNode
  className?: string
}

// Cycle through a few widths so the shimmer rows read as natural columns
// rather than a uniform block.
const CELL_WIDTHS = ['60%', '80%', '40%', '90%', '55%', '70%'] as const

export function TableSkeleton({
  columns,
  rows = 5,
  caption,
  className,
}: TableSkeletonProps) {
  const { t } = useTranslation('common')
  const colCount = Math.max(0, columns)
  const rowCount = Math.max(0, rows)
  const ariaLabel = typeof caption === 'string' ? caption : t('loading')

  return (
    <div
      data-slot="table-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn('relative flex flex-col gap-2', className)}
    >
      {caption ? (
        // `fixed inset-0` centers on the full viewport, not just this
        // block's own (often short) rendered height — the page below a
        // few skeleton rows can be mostly empty space, so anchoring to the
        // block itself left the caption pinned near the top.
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-4 text-center text-base font-semibold text-secondary">
          {caption}
        </div>
      ) : null}
      {/* Decorative shimmer only — the wrapper's role="status" + aria-label
          already announce loading, so keep the fake table out of AT table
          navigation. A wide fake table (many columns) must scroll inside its
          own box rather than stretch this flex column — otherwise the
          caption above centers on the stretched (off-screen) width instead
          of the visible viewport. */}
      <div className="overflow-x-auto">
        <Table aria-hidden="true">
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: colCount }).map((__, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton
                      className="h-3"
                      width={CELL_WIDTHS[(rowIndex + colIndex) % CELL_WIDTHS.length]}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
TableSkeleton.displayName = 'TableSkeleton'
