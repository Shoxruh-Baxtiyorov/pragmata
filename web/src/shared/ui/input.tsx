import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

// Состояния по iqbola-design: placeholder/focused/filled/error/disabled.
// error — через aria-invalid (доступность + стиль одним атрибутом)
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-input border border-border-default bg-surface px-4 text-body text-text-primary',
        'placeholder:text-text-placeholder',
        'focus:border-border-focused focus:outline-none focus:ring-2 focus:ring-brand-20',
        'aria-invalid:border-error aria-invalid:focus:ring-error/20',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
