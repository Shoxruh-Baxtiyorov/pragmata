import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'icon'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-button font-semibold ' +
    'transition-all disabled:opacity-50 disabled:pointer-events-none ' +
    'focus-visible:outline-none focus-visible:shadow-[var(--ring)]'
  const variants = {
    primary:
      'bg-gradient-to-br from-brand-hi to-brand text-on-brand shadow-brand ' +
      'hover:brightness-105 active:brightness-95',
    ghost: 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
    danger: 'text-error hover:bg-error/10',
  }
  const sizes = {
    sm: 'h-8 px-3 text-label',
    md: 'h-9.5 px-4 text-body',
    icon: 'h-9 w-9',
  }
  return (
    <button
      className={cx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? '…' : children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx('rounded-card border border-border-default bg-surface shadow-xs', className)}
    >
      {children}
    </div>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-9.5 rounded-input border border-border-default bg-surface px-3 text-body',
        'text-text-primary placeholder:text-text-placeholder transition-shadow',
        'focus:border-border-focused focus:outline-none focus:shadow-[var(--ring)]',
        className,
      )}
      {...rest}
    />
  )
}

export function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'h-9.5 rounded-input border border-border-default bg-surface px-3 text-body',
        'text-text-primary transition-shadow',
        'focus:border-border-focused focus:outline-none focus:shadow-[var(--ring)]',
        className,
      )}
    >
      {children}
    </select>
  )
}

type Tone = 'brand' | 'neutral' | 'success' | 'warning' | 'error'

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    brand: 'bg-brand-10 text-brand',
    neutral: 'bg-bg-secondary text-text-secondary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 text-caption font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tone?: 'brand' | 'warning'
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-label text-text-secondary">{label}</p>
        {icon && <span className="text-text-placeholder">{icon}</span>}
      </div>
      <p
        className={cx(
          'mt-1 text-h1 font-bold tabular-nums',
          tone === 'warning' && 'text-warning',
          tone === 'brand' && 'text-brand',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-caption text-text-placeholder">{hint}</p>}
    </Card>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  )
}
