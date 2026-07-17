// Перенесено 1:1 из imaktab-front src/shared/ui/badge.tsx (Badge + StatusBadge).
import * as React from 'react'
import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/shared/lib/utils'

const badgeVariants = cva(
  'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[var(--radius-pill)] border border-transparent px-2.5 py-0.5 text-xs font-bold whitespace-nowrap transition-all duration-[var(--dur-fast)] [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-brand-500)] text-white',
        secondary: 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]',
        destructive: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]',
        outline: 'border-[var(--color-border-strong)] text-[var(--color-text-primary)]',
        ghost: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'
  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export type StatusBadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const STATUS_BADGE_TONE: Record<StatusBadgeTone, string> = {
  success:
    'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]',
  warning:
    'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]',
  error:
    'bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)] border-[var(--color-status-error-border)]',
  info: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)] border-[var(--color-status-info-border)]',
  neutral:
    'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral-text)] border-[var(--color-status-neutral-border)]',
}

export function StatusBadge({
  tone,
  icon,
  children,
  className,
  soft = false,
}: {
  tone: StatusBadgeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
  soft?: boolean
}) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(
        'inline-flex h-6 w-fit items-center gap-1 whitespace-nowrap rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-bold [&>svg]:size-3.5',
        STATUS_BADGE_TONE[tone],
        soft && 'border-transparent font-medium',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
