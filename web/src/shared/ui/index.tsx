import type { ReactNode } from 'react'
import { Card } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'
import type { LucideIcon } from '@/shared/ui/icons'
import type { StatusBadgeTone } from '@/shared/ui/badge'

export { Button, buttonVariants } from '@/shared/ui/button'
export { Badge, StatusBadge } from '@/shared/ui/badge'
export type { StatusBadgeTone } from '@/shared/ui/badge'
export { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card'

const TONE_STYLE: Record<StatusBadgeTone | 'brand', { bg: string; text: string }> = {
  brand: { bg: 'var(--color-brand-50)', text: 'var(--color-brand-600)' },
  success: { bg: 'var(--color-success-bg)', text: 'var(--color-success-text)' },
  warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning-text)' },
  error: { bg: 'var(--color-danger-bg)', text: 'var(--color-danger-text)' },
  info: { bg: 'var(--color-info-bg)', text: 'var(--color-info-text)' },
  neutral: { bg: 'var(--color-bg-muted)', text: 'var(--color-text-secondary)' },
}

export function StatTile({
  icon: Icon,
  label,
  value,
  tone = 'brand',
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  tone?: StatusBadgeTone | 'brand'
}) {
  const c = TONE_STYLE[tone]
  return (
    <Card>
      <div className="flex items-center gap-4 px-4">
        <span
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{ background: c.bg, color: c.text }}
        >
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-[var(--color-text-muted)]">{label}</p>
          <p className="font-mono text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
        </div>
      </div>
    </Card>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-xl font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
        <p className="font-medium text-[var(--color-text-primary)]">{title}</p>
        {hint && <p className="text-sm text-[var(--color-text-muted)]">{hint}</p>}
      </div>
    </Card>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-brand-500)]" />
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[var(--radius-md)] bg-[var(--color-bg-muted)]', className)} />
}

export function Select({
  value,
  onChange,
  children,
}: {
  value: string | number
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-3 text-sm font-medium text-[var(--color-text-secondary)] focus:border-[var(--color-brand-500)] focus:outline-none"
    >
      {children}
    </select>
  )
}
