import { type CSSProperties } from 'react'
import { cn } from '@/shared/ds/utils'

export interface SkeletonProps {
  className?: string
  height?: number | string
  width?: number | string
}

export function Skeleton({ className, height, width }: SkeletonProps) {
  // Only emit height/width when a caller passes them explicitly. Inline styles
  // beat classes, so the old `height ?? 12` / `width ?? '100%'` defaults
  // silently overrode every `h-*` / `aspect-*` className — all callers size via
  // className, so every skeleton rendered as a 12px bar.
  const style: CSSProperties = {
    ...(height !== undefined && { height }),
    ...(width !== undefined && { width }),
    background:
      'linear-gradient(90deg, var(--color-neutral-100) 0%, var(--color-bg-muted) 50%, var(--color-neutral-100) 100%)',
    backgroundSize: '800px 100%',
    animation: 'ui-shimmer 1.2s linear infinite',
    borderRadius: 'var(--radius-sm)',
  }
  return <span aria-hidden className={cn('skeleton block', className)} data-loading="true" style={style} />
}
Skeleton.displayName = 'Skeleton'
