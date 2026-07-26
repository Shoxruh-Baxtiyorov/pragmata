/**
 * ResponsiveTable — wraps a <table> and makes it mobile-friendly.
 *
 * mode="stack" (default):
 *   - md+ (≥768 px): renders the table exactly as-is.
 *   - <md: thead is visually hidden; each <tbody><tr> becomes a stacked card;
 *     each <td> reveals its label span (`data-slot="table-cell-label"`, which
 *     the DS TableCell renders from its `data-label` prop) as a real, screen-
 *     reader-accessible per-cell label. If the label is absent the cell is
 *     still readable, just without a label.
 *
 * Stack mode sets `display: block` on the table elements, which strips their
 * implicit ARIA roles — compose with the DS `Table` family (table.tsx), whose
 * explicit role="table"/"rowgroup"/"row"/"columnheader"/"cell" attributes keep
 * the semantics intact for assistive technology.
 *
 * mode="scroll":
 *   - Wraps the table in an overflow-x-auto container with a min-w, matching
 *     the DataTableFrame pattern for tables too wide/complex to stack.
 *
 * Usage:
 *   <ResponsiveTable>
 *     <table>
 *       <thead>…</thead>
 *       <tbody>
 *         <tr><td data-label="Name">Sardor</td>…</tr>
 *       </tbody>
 *     </table>
 *   </ResponsiveTable>
 */

import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/ds/utils'

export type ResponsiveTableMode = 'stack' | 'scroll'

export interface ResponsiveTableProps {
  children: React.ReactNode
  mode?: ResponsiveTableMode
  /** Minimum width applied in scroll mode (default: '640px'). */
  scrollMinWidth?: string
  className?: string
}

/**
 * CSS injected once into <head> for the stack pattern.
 * Tailwind cannot generate `content: attr(data-label)` so we use a tiny
 * scoped style block.  The class name is deterministic so it is safe to
 * inject multiple times (idempotent guard below).
 */
const STACK_STYLE_ID = 'ds-responsive-table-stack'

function ensureStackStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STACK_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STACK_STYLE_ID
  style.textContent = `
/* ResponsiveTable — stack mode (mobile only, < 768 px) */
@media (max-width: 767px) {
  .rt-stack thead {
    /* visually hidden but still accessible to screen readers */
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  .rt-stack table,
  .rt-stack thead,
  .rt-stack tbody,
  .rt-stack th,
  .rt-stack td,
  .rt-stack tr {
    display: block;
  }

  .rt-stack tbody tr {
    border: 1px solid var(--color-border-soft);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
    padding: 0.5rem 0;
    background: var(--color-bg-surface);
  }

  .rt-stack tbody td {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border: none;
    text-align: left;
    font-size: 0.8125rem;
    line-height: 1.4;
    word-break: break-word;
  }

  /* Per-cell label: a real <span> rendered by TableCell from \`data-label\`
     (hidden on desktop) so screen readers announce it — unlike the previous
     \`::before { content: attr(data-label) }\`, which NVDA/JAWS ignore. */
  .rt-stack tbody td [data-slot="table-cell-label"] {
    display: block;
    flex: 0 0 38%;
    min-width: 80px;
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--color-text-muted, hsl(0 0% 45%));
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding-top: 0.0625rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
`
  document.head.appendChild(style)
}

export function ResponsiveTable({
  children,
  mode = 'stack',
  scrollMinWidth = '640px',
  className,
}: ResponsiveTableProps) {
  const { t } = useTranslation('common')

  // Inject stack styles once on mount (no-op on SSR / non-browser environments).
  React.useEffect(() => {
    if (mode === 'stack') ensureStackStyles()
  }, [mode])

  if (mode === 'scroll') {
    return (
      <div
        className={cn('overflow-x-auto -mx-0', className)}
        style={{ WebkitOverflowScrolling: 'touch' }}
        data-testid="responsive-table-scroll"
        // Horizontal scroll containers must be reachable and operable from
        // the keyboard (SC 2.1.1) — a labelled focusable region lets keyboard
        // users scroll with the arrow keys.
        tabIndex={0}
        role="region"
        aria-label={t('table_scroll_region')}
      >
        <div className="nums" style={{ minWidth: scrollMinWidth }}>
          {children}
        </div>
      </div>
    )
  }

  // mode === 'stack'
  return (
    <div
      className={cn(
        // On md+ render the table normally with overflow fallback.
        // On mobile the rt-stack CSS above transforms it into cards.
        'rt-stack w-full md:overflow-x-auto',
        className,
      )}
      data-testid="responsive-table-stack"
    >
      {children}
    </div>
  )
}

ResponsiveTable.displayName = 'ResponsiveTable'
