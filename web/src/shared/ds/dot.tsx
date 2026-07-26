import { cn } from '@/shared/ds/utils'

export type DotTone = 'success' | 'danger' | 'warning' | 'neutral' | 'info'

export interface DotProps {
  tone?: DotTone
  size?: number
  className?: string
  'aria-label'?: string
}

const DOT_COLOR: Record<DotTone, string> = {
  success: 'var(--color-status-success)',
  danger:  'var(--color-status-error)',
  warning: 'var(--color-status-warning)',
  info:    'var(--color-status-info)',
  neutral: 'var(--color-status-neutral)',
}

export function Dot({ tone = 'neutral', size = 8, className, ...rest }: DotProps) {
  return (
    <span
      role={rest['aria-label'] ? 'img' : undefined}
      aria-label={rest['aria-label']}
      aria-hidden={rest['aria-label'] ? undefined : true}
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ width: size, height: size, background: DOT_COLOR[tone] }}
    />
  )
}
Dot.displayName = 'Dot'
