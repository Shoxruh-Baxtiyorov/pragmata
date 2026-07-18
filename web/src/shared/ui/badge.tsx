import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

// Пилюля (radius/pill); tone — семантические System-цвета
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-pill px-3 py-1 text-caption font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-bg-secondary text-text-secondary',
        brand: 'bg-brand-10 text-brand',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        error: 'bg-error/10 text-error',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
