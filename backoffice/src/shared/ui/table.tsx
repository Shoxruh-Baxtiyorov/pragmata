import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, ChevronsUpDown, ChevronUp } from '@/shared/ui/icons'

import { cn } from "@/shared/lib/utils"

// Interactive descendants whose own click/activation must NOT trigger
// whole-row navigation (action buttons, links, form controls, menus). A row's
// click handler bails when the event originated inside one of these.
const ROW_INTERACTIVE_SELECTOR =
  'a,button,input,select,textarea,label,[role="button"],[role="menuitem"],[role="checkbox"],[data-no-row-nav]'
const INDEX_HEADER_LABELS = new Set(['#', '№'])

function getPrimitiveText(children: React.ReactNode): string | null {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (!Array.isArray(children)) return null

  const parts = children.map(getPrimitiveText)
  if (parts.some((part) => part == null)) return null
  return parts.join('')
}

function isIndexHeader(children: React.ReactNode): boolean {
  const text = getPrimitiveText(children)?.trim()
  return text != null && INDEX_HEADER_LABELS.has(text)
}

function isNumericCell(children: React.ReactNode): boolean {
  const text = getPrimitiveText(children)?.trim()
  return text != null && /^\d+$/.test(text)
}

/**
 * Table primitive family.
 *
 * Visual contract:
 *   - table: 100% width, 12px font, collapsed borders
 *   - th:    8px 12px padding, muted text, 600 weight, soft bottom border, left-aligned
 *   - td:    10px 12px padding, soft bottom border, vertical-align middle
 *   - tr:    row hover background; last row drops its bottom border
 *
 * Composes cleanly inside <ResponsiveTable> (mobile stack/scroll) — the stack
 * mode hides <thead> and TableCell renders its `data-label` as a real (hidden
 * on desktop) <span> that the stack CSS reveals as the per-cell label.  Works
 * alongside <TableState> rows (loading / error / empty) placed in <TableBody>.
 */

// Explicit ARIA roles mirror the implicit table semantics. They look
// redundant, but <ResponsiveTable> stack mode sets `display: block` on
// table/thead/tbody/tr/th/td, which makes browsers DROP the implicit roles —
// the explicit ones keep the table navigable for screen readers there.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      role="table"
      className={cn(
        "w-full border-collapse text-[13px] font-medium text-[var(--color-text-primary)]",
        className,
      )}
      {...props}
    />
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      role="rowgroup"
      className={className}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      role="rowgroup"
      className={className}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      role="rowgroup"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

type TableRowProps = React.ComponentProps<"tr"> & {
  /** Applies the selected-row styling slot (also exposes `data-selected`). */
  selected?: boolean
  /**
   * When set, the WHOLE row becomes a link to this route — clicking anywhere
   * on the row navigates there (keyboard-accessible). Clicks that originate
   * inside an interactive child (buttons, links, inputs, menus, or anything
   * marked `data-no-row-nav`) are ignored so per-row actions keep working.
   */
  href?: string
}

const ROW_BASE_CLASS =
  // The final body/footer row drops the soft border under its cells.
  "transition-colors duration-[var(--dur-fast)] last:[&>td]:border-b-0 hover:bg-[var(--color-row-alt)] data-[selected]:bg-[var(--color-brand-50)]"

function TableRow({ href, ...props }: TableRowProps) {
  // The clickable variant lives in its own component so `useNavigate()` (which
  // needs a Router) is only ever called when `href` is provided — plain rows
  // stay router-free (e.g. isolated unit tests render <Table> with no Router).
  if (href != null) return <ClickableTableRow href={href} {...props} />
  const { className, selected, ...rest } = props
  return (
    <tr
      data-slot="table-row"
      data-selected={selected ? "" : undefined}
      role="row"
      className={cn(ROW_BASE_CLASS, className)}
      {...rest}
    />
  )
}

function ClickableTableRow({
  href,
  className,
  selected,
  onClick,
  onKeyDown,
  ...props
}: TableRowProps & { href: string }) {
  const navigate = useNavigate()
  return (
    <tr
      data-slot="table-row"
      data-selected={selected ? "" : undefined}
      // Keep the implicit row role (explicit for ResponsiveTable stack mode —
      // see note above). role="link" would hide the nested Checkbox/RowActions
      // controls from AT, so the row stays a row that happens to be tabbable.
      role="row"
      tabIndex={0}
      className={cn(
        ROW_BASE_CLASS,
        "cursor-pointer",
        // Inset box-shadow focus indicator: outlines are clipped/dropped on
        // <tr> under border-collapse, so the global :focus-visible outline
        // alone is not reliable here.
        "focus-visible:shadow-[inset_0_0_0_2px_var(--color-brand-500)]",
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if ((event.target as HTMLElement).closest(ROW_INTERACTIVE_SELECTOR)) return
        navigate(href)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
        if (event.key !== "Enter" && event.key !== " ") return
        if ((event.target as HTMLElement).closest(ROW_INTERACTIVE_SELECTOR)) return
        event.preventDefault()
        navigate(href)
      }}
      {...props}
    />
  )
}

function TableHead({
  className,
  children,
  scope = "col",
  sortable = false,
  sortDirection = null,
  onSort,
  ...props
}: React.ComponentProps<"th"> & {
  /** Render as a sortable header (clickable, shows a chevron). */
  sortable?: boolean
  /** Current sort direction for this column, or null when unsorted. */
  sortDirection?: "asc" | "desc" | null
  /** Invoked when the user activates the sortable header. */
  onSort?: () => void
}) {
  const ariaSort = sortable
    ? sortDirection === "asc"
      ? "ascending"
      : sortDirection === "desc"
        ? "descending"
        : "none"
    : undefined

  const SortIcon =
    sortDirection === "asc"
      ? ChevronUp
      : sortDirection === "desc"
        ? ChevronDown
        : ChevronsUpDown

  return (
    <th
      data-slot="table-head"
      role="columnheader"
      scope={scope}
      aria-sort={ariaSort}
      className={cn(
        "border-b border-[var(--color-border-subtle)] bg-[var(--color-row-alt)] px-4 py-3 text-left align-middle text-[11px] font-bold uppercase text-[var(--color-text-muted)]",
        isIndexHeader(children) && "w-12 min-w-12 whitespace-nowrap tabular-nums",
        sortable && "cursor-pointer select-none",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          data-slot="table-head-sort"
          className="-mx-1 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1 py-0.5 font-bold text-inherit hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-ring)]"
        >
          {children}
          <SortIcon
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0",
              sortDirection ? "opacity-100" : "opacity-50",
            )}
          />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

function TableCell({
  className,
  children,
  "data-label": dataLabel,
  ...props
}: React.ComponentProps<"td"> & {
  /**
   * Column label shown next to the value in <ResponsiveTable> stack mode.
   * Rendered as a real (hidden-on-desktop) <span> so screen readers can hear
   * it on mobile — a CSS `content: attr()` pseudo-element would be invisible
   * to AT. Also kept as a `data-label` attribute for styling/tests.
   */
  "data-label"?: string
}) {
  const numeric = isNumericCell(children)

  return (
    <td
      data-slot="table-cell"
      data-label={dataLabel}
      role="cell"
      className={cn(
        // `overflow-wrap:anywhere` lets a long unbroken value (e.g. a legacy
        // 1000-char name) wrap within its column instead of stretching the row.
        // Cells that must stay on one line opt out with `whitespace-nowrap`/`truncate`.
        "border-b border-[var(--color-border-subtle)] px-4 py-3 align-middle [overflow-wrap:anywhere]",
        numeric && "whitespace-nowrap tabular-nums [overflow-wrap:normal]",
        className,
      )}
      {...props}
    >
      {dataLabel ? (
        // Hidden everywhere except ResponsiveTable stack mode (< md), where
        // the injected .rt-stack CSS turns it into the per-cell label.
        <span data-slot="table-cell-label" className="hidden">
          {dataLabel}
        </span>
      ) : null}
      {children}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-2 text-xs font-medium text-[var(--color-text-muted)]", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
