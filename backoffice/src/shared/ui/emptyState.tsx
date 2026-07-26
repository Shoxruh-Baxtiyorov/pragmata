import type { ReactNode } from 'react'
import { useId } from 'react'
import { Inbox, AlertTriangle, SlidersHorizontal } from '@/shared/ui/icons'
import { Link } from 'react-router-dom'
import { Button } from './button'
import { cn } from '@/shared/lib/utils'

type EmptyStateAction =
  | { label: string; onClick: () => void; to?: never }
  | { label: string; to: string; onClick?: never }

/**
 * Visual treatment of the empty surface.
 * - `empty`     — neutral "there is nothing here yet" (default).
 * - `error`     — load/fetch failure (alert role, danger tint).
 * - `filtered`  — data exists but the active filters/search exclude it all.
 *   Reads as a muted "no results match your filters"; pair with an `action`
 *   wired to a "Clear filters" handler.
 */
export type EmptyStateVariant = 'empty' | 'error' | 'filtered'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  secondaryHint?: ReactNode
  variant?: EmptyStateVariant
  /**
   * Convenience alias for `variant="filtered"`. When true (and `variant` is
   * left at its default) the filtered-empty treatment is used.
   */
  filtered?: boolean
  className?: string
}

const ICON_SIZE = 48

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryHint,
  variant,
  filtered,
  className,
}: EmptyStateProps) {
  const titleId = useId()
  const descId = useId()
  const resolvedVariant: EmptyStateVariant =
    variant ?? (filtered ? 'filtered' : 'empty')
  const isError = resolvedVariant === 'error'
  const isFiltered = resolvedVariant === 'filtered'

  const DefaultIcon = isError ? AlertTriangle : isFiltered ? SlidersHorizontal : Inbox
  const renderedIcon = icon ?? <DefaultIcon size={ICON_SIZE} aria-hidden />

  return (
    <section
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      data-variant={resolvedVariant}
      className={cn(
        'mx-auto flex max-w-[360px] flex-col items-center justify-center gap-3 px-6 py-16 text-center',
        className,
      )}
    >
      <span
        aria-hidden
        className="mb-1 flex items-center justify-center rounded-full"
        style={{
          width: 80,
          height: 80,
          background: isError
            ? 'rgba(239, 68, 68, 0.08)'
            : 'var(--color-bg-app, rgba(148, 163, 184, 0.08))',
          color: isError ? 'var(--color-danger-500)' : 'var(--color-text-muted)',
        }}
      >
        {renderedIcon}
      </span>

      <h2
        id={titleId}
        className="m-0 text-base font-semibold leading-snug"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h2>

      {description && (
        <p
          id={descId}
          className="m-0 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {description}
        </p>
      )}

      {action && (
        <div className="mt-2">
          {'to' in action && action.to ? (
            <Button asChild variant={isError ? 'secondary' : 'default'}>
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              variant={isError ? 'secondary' : 'default'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}

      {secondaryHint ? (
        <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {secondaryHint}
        </p>
      ) : null}
    </section>
  )
}
