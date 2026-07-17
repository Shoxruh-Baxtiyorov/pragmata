import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'ok'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]'
  const variants: Record<string, string> = {
    primary: 'bg-[var(--color-accent)] text-black hover:opacity-90',
    ghost:
      'bg-[var(--color-surface-2)] text-[var(--color-text)] hover:bg-[var(--color-border)]',
    danger: 'bg-[var(--color-alert)] text-black hover:opacity-90',
    ok: 'bg-[var(--color-ok)] text-black hover:opacity-90',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  )
}

export function Badge({
  color,
  children,
}: {
  color: string
  children: ReactNode
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color, border: `1px solid ${color}` }}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <p className="text-[var(--color-text)]">{title}</p>
      {hint && <p className="text-sm text-[var(--color-muted)]">{hint}</p>}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
    </div>
  )
}
