import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

export interface AppPageProps {
  /** Page H1 — use plain Uzbek (i18n handled at route level when needed). */
  title: string
  /** Subtitle / period / context under the title. */
  description?: ReactNode
  /** Filters, primary CTA row — keep one dominant primary action. */
  toolbar?: ReactNode
  /** Main content (tables, forms, cards). */
  children: ReactNode
  className?: string
}

/**
 * Standard authenticated page chrome: title stack + optional toolbar + content area
 * using layout tokens (`--content-px`, `--content-max-w`).
 */
export function AppPage({ title, description, toolbar, children, className }: AppPageProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[var(--content-max-w)] px-[var(--content-px)] pb-8 pt-4 font-[family-name:var(--font-sans)]',
        className,
      )}
    >
      <header className="mb-6 flex flex-col gap-3 border-b border-[var(--color-border-soft)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-[length:var(--fs-21)] font-extrabold tracking-normal text-[var(--color-text-primary)]">
            {title}
          </h1>
          {description != null && description !== '' && (
            <div className="mt-1 text-[length:var(--fs-14)] font-medium text-[var(--color-text-muted)]">{description}</div>
          )}
        </div>
        {toolbar != null && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {toolbar}
          </div>
        )}
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  )
}
