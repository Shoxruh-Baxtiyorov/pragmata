/**
 * Барель общих UI-компонентов операторского фронта.
 *
 * ВАЖНО: с миграцией на дизайн-кит iqbola (shared/ds) этот барель стал ТОНКИМ
 * АДАПТЕРОМ над китом — сохраняет прежние prop-API экранов (variant/size/tone/
 * loading, Modal onClose…), но рендерит компоненты кита. Так все экраны получают
 * вид iqbola без правок в каждом файле.
 */
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import {
  Button as KitButton,
  Card as KitCard,
  Dialog,
  DialogContent,
  Input as KitInput,
  Skeleton as KitSkeleton,
  Spinner as KitSpinner,
  StatusBadge,
  type StatusBadgeTone,
} from '@/shared/ds'
import { Loader2 } from '@/shared/ds/icons'

export { LangSelect } from './LangSelect'
export { SiteSelect } from './SiteSelect'

// --- Button: старые варианты/размеры → кит ----------------------------------

type OldVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type OldSize = 'lg' | 'md' | 'sm' | 'icon'
const VARIANT_MAP = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
  destructive: 'destructive',
} as const
const SIZE_MAP = { lg: 'lg', md: 'default', sm: 'sm', icon: 'icon' } as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OldVariant
  size?: OldSize
  loading?: boolean
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <KitButton
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      className={className}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </KitButton>
  )
}

// --- Input: кит + безопасный дефолт maxLength (URL/RTSP не резать) -----------

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <KitInput maxLength={2048} {...props} />
}

// --- Card: кит + горизонтальный паддинг по умолчанию (у кита только py) ------

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <KitCard className={cn('px-4', className)} {...props} />
}

// --- Badge: старый tone → StatusBadge кита ----------------------------------

const TONE_MAP: Record<string, StatusBadgeTone> = {
  neutral: 'neutral',
  brand: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
}

export function Badge({
  className,
  tone = 'neutral',
  children,
}: {
  className?: string
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'error'
  children?: ReactNode
}) {
  return (
    <StatusBadge tone={TONE_MAP[tone] ?? 'neutral'} className={className}>
      {children}
    </StatusBadge>
  )
}

// --- Modal: старый onClose → кит Dialog -------------------------------------

export function Modal({
  onClose,
  children,
  className,
}: {
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn('max-w-lg', className)}>{children}</DialogContent>
    </Dialog>
  )
}

// --- вспомогательное ---------------------------------------------------------

export function Spinner() {
  return <KitSpinner />
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
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-[13.5px] text-[var(--color-text-secondary)]">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  )
}

// Нативный select в токенах кита
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
        'h-11 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] px-3 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] outline-none focus-visible:border-[var(--color-brand-500)]',
        className,
      )}
    >
      {children}
    </select>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <KitSkeleton className={className} />
}

export function SkeletonList({ rows = 5, className = 'h-16' }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <KitSkeleton key={i} className={className} />
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
        <KitSkeleton key={i} className={item} />
      ))}
    </div>
  )
}

export function SkeletonTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <KitSkeleton key={i} className="h-24" />
      ))}
    </div>
  )
}

export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] p-4 shadow-[var(--shadow-xs)]">
      <div className="text-[12.5px] font-semibold text-[var(--color-text-secondary)]">{label}</div>
      <div className="mt-1 font-mono text-[26px] font-extrabold text-[var(--color-text-primary)]">
        {value}
      </div>
    </div>
  )
}

export function EmptyState({ text, onRetry }: { text?: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-[var(--color-text-secondary)]">
      {text ?? t('common.empty')}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

export function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState text={t('common.stub')} />
    </div>
  )
}
