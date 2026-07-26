import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from '@/shared/ui/icons'
import { cn } from '@/shared/lib/utils'

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]'

export interface ChipProps {
  onDismiss?: () => void
  className?: string
  children: ReactNode
}

export function Chip({ onDismiss, className, children }: ChipProps) {
  const { t } = useTranslation('common')
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border-soft)] shadow-[var(--shadow-xs)]',
        'bg-[var(--color-bg-surface)] text-sm font-bold text-[var(--color-text-primary)] py-1',
        onDismiss ? 'pl-3 pr-1.5' : 'px-3',
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {onDismiss && (
        <button
          type="button"
          aria-label={t('remove')}
          onClick={onDismiss}
          className={cn(
            // 24px hit target (WCAG 2.5.8); -my-1 keeps the chip's visual
            // height unchanged (the round hover area overflows the text row).
            'inline-flex items-center justify-center rounded-full size-6 -my-1 shrink-0',
            'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',
            FOCUS_RING,
          )}
        >
          <X size={10} aria-hidden />
        </button>
      )}
    </span>
  )
}
Chip.displayName = 'Chip'
