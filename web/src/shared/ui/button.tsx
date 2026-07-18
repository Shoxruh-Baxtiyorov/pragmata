import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

// Вариантная матрица по iqbola-design component-builder:
// Type: Primary/Secondary/Ghost/Destructive × Size: lg/md/sm/icon × State: default/loading/disabled
// Touch target ≥44px (md и выше)
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-button text-body font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-on-brand hover:bg-brand-pressed',
        secondary: 'bg-brand-10 text-brand hover:bg-brand-20',
        ghost: 'text-text-primary hover:bg-bg-secondary',
        destructive: 'bg-error text-on-brand hover:opacity-90',
      },
      size: {
        lg: 'h-12 px-6',
        md: 'h-11 px-5',
        sm: 'h-9 px-4 text-label',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export function Button({ className, variant, size, loading, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="size-5 animate-spin" />}
      {children}
    </button>
  )
}
