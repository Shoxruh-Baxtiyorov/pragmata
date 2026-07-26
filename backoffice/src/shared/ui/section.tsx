import { type CSSProperties, type ReactNode } from 'react'

export interface SectionProps {
  title?: ReactNode
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Section({ title, description, action, children, className, style }: SectionProps) {
  return (
    <section data-slot="section" className={className} style={style}>
      {(title || action) && (
        <div data-slot="section-header" className="flex flex-wrap items-start justify-between gap-2 mb-4">
          {title && (
            <h2 className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {description && (
        <p className="text-xs text-[var(--color-text-muted)] mt-0 mb-4">
          {description}
        </p>
      )}
      {children}
    </section>
  )
}
Section.displayName = 'Section'
