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
// Kit toggle passed through unchanged — screens still using a raw
// `<input type="checkbox">` can switch to this without a new import path.
export { Switch } from '@/shared/ds'
// Подтверждение необратимых действий — только через диалог кита (см. его
// докстринг): window.confirm нельзя стилизовать и он не локализуется.
export { ConfirmDialog } from '@/shared/ds'
// Плашка-«таблетка» кита: сама решает hit-target и aria-label у крестика.
export { Chip } from '@/shared/ds'
// Графики кита НАМЕРЕННО не реэкспортируются отсюда: этот барель импортирует
// каждый экран, а реэкспорт втягивал recharts (~330 КБ gzip вместе с его
// деревом d3/redux) в общий бандл — его грузил даже экран входа. Две страницы
// с графиками берут их напрямую из '@/shared/ds/charts' и грузятся отдельным
// чанком (см. lazy в AppRouter).

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
      {/* ✕ рисует сам кит: один крестик с aria-label на все модалки. Раньше
          каждый экран рисовал свой (showCloseButton=false), и два из пяти были
          без подписи для скринридера. Крестик у кита абсолютный (top-2 right-2,
          36px) — шапки модалок держат под него pr-8. */}
      <DialogContent className={cn('max-w-lg', className)}>{children}</DialogContent>
    </Dialog>
  )
}

// --- вспомогательное ---------------------------------------------------------

export function Spinner({ size, className }: { size?: number; className?: string }) {
  return <KitSpinner size={size} className={className} />
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

// --- ErrorNote: тонированная плашка ошибки/предупреждения --------------------

// Одна плашка на все экраны. Раньше её класс копировали ~12 раз: половина копий
// брала алиасы --color-error-*, половина --color-status-error-* (резолвятся в
// одно и то же), но текст расходился реально — text-xs font-medium против
// text-label. Канон — status-токены (как у StatusBadge кита) и text-label.
const NOTE_TONE = {
  error:
    'border-[var(--color-status-error-border)] bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
  warning:
    'border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]',
} as const

export function ErrorNote({
  tone = 'error',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { tone?: 'error' | 'warning' }) {
  return (
    <p
      className={cn(
        'rounded-[var(--radius-md)] border px-3 py-2 text-label',
        NOTE_TONE[tone],
        className,
      )}
      {...props}
    >
      {children}
    </p>
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

export function EmptyState({
  text,
  hint,
  icon,
  onRetry,
  className,
}: {
  text?: string
  hint?: ReactNode
  icon?: ReactNode
  onRetry?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center text-[var(--color-text-secondary)]',
        // С иконкой — «богатая» пустота в пунктирной рамке (архив, фото человека).
        // Без иконки — прежняя простая строка, отбитая по вертикали.
        icon
          ? 'gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] p-10'
          : 'gap-3 py-16',
        className,
      )}
    >
      {icon}
      <p className="text-body">{text ?? t('common.empty')}</p>
      {hint && <p className="text-caption">{hint}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

// --- FieldLabel: подпись поля формы -----------------------------------------

// Один набор типографики на все формы. Отступ снизу остаётся за вызывающим:
// у части форм <label> — обычный блок (нужен mb-1.5), у части — flex-колонка
// с gap-1.5, и там лишний margin даёт двойной зазор.
export function FieldLabel({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <span
      className={cn('block text-xs font-semibold text-[var(--color-text-secondary)]', className)}
    >
      {children}
    </span>
  )
}

// --- StaleBadge: «связь потеряна, цифры на экране устарели» -------------------

// Экраны с поллингом при обрыве не гасят данные, а помечают их устаревшими.
// Раньше эту метку набирали руками на пяти страницах.
export function StaleBadge({ show, className }: { show: boolean; className?: string }) {
  const { t } = useTranslation()
  if (!show) return null
  return (
    <Badge tone="warning" className={className}>
      {t('common.noConnection')}
    </Badge>
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
