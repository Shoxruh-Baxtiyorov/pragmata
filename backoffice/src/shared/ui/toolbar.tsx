import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export interface ToolbarProps {
  title?: ReactNode
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export function Toolbar({ title, children, className, style }: ToolbarProps) {
  return (
    <div
      data-slot="toolbar"
      className={cn(
        'flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[var(--color-border-soft)]',
        className,
      )}
      style={style}
    >
      {title && (
        <strong className="text-xs font-semibold text-[var(--color-text-primary)] shrink-0">
          {title}
        </strong>
      )}
      <div className="flex-1" />
      {children}
    </div>
  )
}
Toolbar.displayName = 'Toolbar'
