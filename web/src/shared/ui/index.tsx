import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

import { Button } from './button'
export { Button } from './button'
export { Input } from './input'
export { Card } from './card'
export { Badge } from './badge'
export { Modal } from './modal'
export { LangSelect } from './LangSelect'
export { SiteSelect } from './SiteSelect'

export function Spinner() {
  return <Loader2 className="size-6 animate-spin text-brand" />
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
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-h2">{title}</h1>
        {subtitle && <p className="text-body text-text-secondary">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

// Нативный select в стилях Input (иконки/токены DS)
export function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string | number
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-11 rounded-input border border-border-default bg-surface px-4 text-body text-text-primary',
        className,
      )}
    >
      {children}
    </select>
  )
}

// Скелет загрузки — форму задаёт className (высота/aspect)
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-card bg-bg-secondary', className)} />
}

// Скелетоны под форму контента — вместо спиннера на каждой странице
export function SkeletonList({ rows = 5, className = 'h-16' }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  )
}

export function SkeletonGrid({
  count = 8,
  item = 'aspect-[3/4]',
  cols = 'grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5',
}: {
  count?: number
  item?: string
  cols?: string
}) {
  return (
    <div className={cn('grid', cols)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={item} />
      ))}
    </div>
  )
}

export function SkeletonTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-s">
      <div className="text-label text-text-secondary">{label}</div>
      <div className="mt-1 text-h1 font-mono">{value}</div>
    </div>
  )
}

export function EmptyState({ text, onRetry }: { text?: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-text-secondary">
      {text ?? t('common.empty')}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

// Заглушка раздела — используется всеми ещё не реализованными фичами
export function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState text={t('common.stub')} />
    </div>
  )
}
