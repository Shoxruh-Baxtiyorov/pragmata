"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Search, X } from '@/shared/ds/icons'

import { cn } from "@/shared/ds/utils"
import { Input } from "./input"

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** When provided, a clear (×) button appears once the field is non-empty. */
  onClear?: () => void
  wrapperClassName?: string
}

function SearchInput({
  className,
  wrapperClassName,
  value,
  onClear,
  ...props
}: SearchInputProps) {
  const { t } = useTranslation("common")
  const showClear =
    onClear != null && value != null && String(value).length > 0
  // Placeholder alone is not an accessible name (WCAG 1.3.1): unless the
  // consumer provided one (aria-label/aria-labelledby, or an `id` a visible
  // `<label htmlFor>` can point at), default to the placeholder text.
  const hasAccessibleName =
    props["aria-label"] != null ||
    props["aria-labelledby"] != null ||
    props.id != null
  const defaultAriaLabel = hasAccessibleName
    ? undefined
    : props.placeholder || t("search")
  return (
    <div
      data-slot="search-input"
      className={cn("relative flex items-center", wrapperClassName)}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2.5 size-4 text-[var(--color-text-muted)]"
      />
      <Input
        type="search"
        // Suppress the browser's native saved-search / autofill dropdown: with
        // type="search" and no autocomplete, Chrome overlays a list of past
        // values on top of the app UI. Consumers can still override via props.
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        aria-label={defaultAriaLabel}
        className={cn(
          "pl-8 [&::-webkit-search-cancel-button]:appearance-none",
          showClear && "pr-8",
          className,
        )}
        {...props}
      />
      {showClear ? (
        <button
          type="button"
          aria-label={t("clear_search")}
          onClick={onClear}
          className="absolute right-1.5 flex size-6 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export { SearchInput }
