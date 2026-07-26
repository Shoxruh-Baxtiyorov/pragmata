import * as React from "react"

import { cn } from "@/shared/lib/utils"
import { Card } from "./card"

export interface TableCardProps {
  /** Left-aligned heading. */
  title?: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned filters / search / actions (e.g. SearchInput + SelectField). */
  toolbar?: React.ReactNode
  /** The table — typically `<ResponsiveTable><Table>…</Table></ResponsiveTable>`. */
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

/**
 * Bordered card with a title + filter-bar header and an edge-to-edge body for a
 * table. Compose with the DS `Table` family and `ResponsiveTable`.
 */
export function TableCard({
  title,
  description,
  toolbar,
  children,
  className,
  bodyClassName,
}: TableCardProps) {
  const hasHeader = Boolean(title || description || toolbar)
  return (
    <Card className={className}>
      {hasHeader ? (
        <div
          data-slot="table-card-header"
          className="flex flex-wrap items-center gap-2 px-4"
        >
          {title || description ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              {title ? (
                // h2: TableCard always sits under the page title, which
                // AppPage renders as the page's single <h1>.
                <h2 className="font-heading text-base leading-snug font-bold text-[var(--color-text-primary)]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <div className="text-sm font-medium text-[var(--color-text-muted)]">{description}</div>
              ) : null}
            </div>
          ) : null}
          {toolbar ? (
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              {toolbar}
            </div>
          ) : null}
        </div>
      ) : null}
      <div data-slot="table-card-body" className={cn("min-w-0", bodyClassName)}>
        {children}
      </div>
    </Card>
  )
}
TableCard.displayName = "TableCard"
