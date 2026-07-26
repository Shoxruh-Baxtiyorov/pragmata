import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/ds/utils'
import { SlidersHorizontal } from '@/shared/ds/icons'
import { Spinner } from './spinner'

export type TableStateStatus = 'loading' | 'error' | 'empty' | 'filtered-empty'

export interface TableStateProps {
  status: TableStateStatus
  renderAs?: 'row' | 'block'
  colSpan?: number
  skeletonRows?: number
  onRetry?: () => void
  emptyMessage?: string
  loadingMessage?: string
  /** Message for status="filtered-empty". Defaults to common "no_results". */
  filteredMessage?: string
  /** Wires the inline "Clear filters" affordance for status="filtered-empty". */
  onClear?: () => void
  /** Label for the clear-filters affordance. Defaults to common "clear_filters". */
  clearLabel?: string
}

const INLINE_BTN =
  'text-[var(--color-brand-text)] underline text-xs min-h-[44px] min-w-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-brand-text)]'
const INLINE_BTN_STYLE: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer' }

export function TableState({
  status, renderAs = 'row', colSpan = 1, skeletonRows: _skeletonRows = 5, onRetry,
  emptyMessage,
  loadingMessage,
  filteredMessage,
  onClear,
  clearLabel,
}: TableStateProps) {
  const { t } = useTranslation('common')
  const cellStyle: CSSProperties = {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: 13,
  }

  const content = (() => {
    if (status === 'loading') {
      return (
        <span className="inline-flex items-center gap-2">
          <Spinner size={14} />
          {loadingMessage ?? t('loading')}
        </span>
      )
    }
    if (status === 'error') {
      return (
        <span className="inline-flex items-center justify-center gap-3">
          <span>{t('error')}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={cn(INLINE_BTN)}
              style={INLINE_BTN_STYLE}
            >
              {t('retry')}
            </button>
          )}
        </span>
      )
    }
    if (status === 'filtered-empty') {
      const resolvedClearLabel = clearLabel ?? t('clear_filters')
      return (
        <span className="inline-flex items-center justify-center gap-2">
          <SlidersHorizontal size={14} aria-hidden />
          <span>{filteredMessage ?? t('no_results')}</span>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label={resolvedClearLabel}
              className={cn(INLINE_BTN)}
              style={INLINE_BTN_STYLE}
            >
              {resolvedClearLabel}
            </button>
          )}
        </span>
      )
    }
    return emptyMessage ?? t('no_data')
  })()

  const role =
    status === 'loading' || status === 'filtered-empty'
      ? 'status'
      : status === 'error'
        ? 'alert'
        : undefined
  const style = status === 'error'
    ? { ...cellStyle, color: 'var(--color-danger-500)' }
    : cellStyle

  if (renderAs === 'block') {
    return (
      <div
        className="rounded-[10px] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] px-4 py-8"
        style={style}
        role={role}
        aria-live={status === 'loading' ? 'polite' : undefined}
        data-loading={status === 'loading' ? 'true' : undefined}
      >
        {content}
      </div>
    )
  }

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="py-8 px-4"
        style={style}
        data-loading={status === 'loading' ? 'true' : undefined}
      >
        {/* status/alert lives on an inner span so the <td> keeps its cell
            role — a role attribute on the cell itself breaks the table's
            row/cell structure for AT. */}
        <span
          role={role}
          aria-live={status === 'loading' ? 'polite' : undefined}
        >
          {content}
        </span>
      </td>
    </tr>
  )
}
TableState.displayName = 'TableState'
