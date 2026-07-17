// Перенесено 1:1 из imaktab-front src/shared/ui/button.tsx (cva + data-slot + Slot).
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none select-none focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-brand-500)] text-white shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-600)]',
        outline:
          'border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-bg-muted)]',
        secondary:
          'bg-[var(--color-bg-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-neutral-100)]',
        ghost:
          'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]',
        destructive:
          'bg-[var(--color-danger-500)] text-white hover:bg-[var(--color-danger-600)]',
        success: 'bg-[var(--color-success-500)] text-white hover:bg-[var(--color-success-600)]',
        link: 'text-[var(--color-brand-text)] underline-offset-4 hover:text-[var(--color-brand-text-hover)] hover:underline',
      },
      size: {
        default: 'h-11 gap-2 px-4',
        xs: "h-7 gap-1 rounded-[var(--radius-sm)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-[var(--radius-md)] px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-12 gap-2 px-5 text-[15px]',
        icon: 'size-10',
        'icon-sm': 'size-9 rounded-[var(--radius-md)]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
