// Перенесено из imaktab-front src/shared/ui/card.tsx (Card + parts, data-slot).
import * as React from 'react'
import { cn } from '@/shared/lib/utils'

function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] py-4 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] data-[size=sm]:gap-3 data-[size=sm]:py-3',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex items-start justify-between gap-2 px-4', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('font-heading text-base leading-snug font-bold text-[var(--color-text-primary)]', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-4', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardContent }
