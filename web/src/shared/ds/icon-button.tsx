import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/ds/utils'
import { Spinner } from './spinner'

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]'

export type IconButtonSize = 28 | 32 | 36 | 40 | 44

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  'aria-label': string
  size?: IconButtonSize
  loading?: boolean
  children?: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 44, className, children, loading, disabled, type, style, onClick, ...rest },
  ref,
) {
  // While loading (but not explicitly disabled) the button stays focusable so
  // screen readers can perceive aria-busy; clicks are blocked via aria-disabled
  // + a no-op handler instead of the native `disabled` attribute.
  const blocked = disabled || loading
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled}
      aria-disabled={blocked || undefined}
      aria-busy={loading || undefined}
      onClick={blocked ? undefined : onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-md)] transition-colors duration-[var(--dur-fast)]',
        'bg-transparent text-[var(--color-text-muted)] border border-transparent',
        'hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'aria-disabled:opacity-50 aria-disabled:cursor-not-allowed',
        FOCUS_RING,
        className,
      )}
      {...rest}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    >
      {loading ? <Spinner size={Math.round(size / 2.2)} /> : children}
    </button>
  )
})
IconButton.displayName = 'IconButton'
