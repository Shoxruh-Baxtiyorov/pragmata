import { type CSSProperties } from 'react'
import { cn } from '@/shared/lib/utils'

export interface SkeletonProps {
  className?: string
  height?: number | string
  width?: number | string
}

export function Skeleton({ className, height, width }: SkeletonProps) {
  const style: CSSProperties = {
    height: height ?? 12,
    width: width ?? '100%',
    background:
      'linear-gradient(90deg, var(--color-neutral-100) 0%, var(--color-bg-muted) 50%, var(--color-neutral-100) 100%)',
    backgroundSize: '800px 100%',
    animation: 'ui-shimmer 1.2s linear infinite',
    borderRadius: 'var(--radius-sm)',
  }
  return <span aria-hidden className={cn('skeleton block', className)} data-loading="true" style={style} />
}
Skeleton.displayName = 'Skeleton'
