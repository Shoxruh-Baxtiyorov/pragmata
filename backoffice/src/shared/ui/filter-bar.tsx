import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/utils'
import { Badge } from './badge'
import { Button } from './button'
import { Combobox } from './combobox'
import { SearchInput } from './search-input'

/* -------------------------------------------------------------------------------------------------
 * FilterBar — config-driven, dense, wrapping labeled filter bar.
 *
 * Each filter renders as a searchable `Combobox` at the default size (matching form inputs; the
 * field draws its own label + a11y wiring).
 * An optional `search` renders a `SearchInput` (and marks the bar as a `role="search"` landmark),
 * and an optional clear control shows a ghost button plus an active-count Badge. User-facing
 * strings come from props (i18n is the caller's job), except the active-count aria-label which is
 * translated here; the only baked-in fallback is the generic Clear button label (`clearLabel`).
 * -----------------------------------------------------------------------------------------------*/

export interface FilterBarFilter {
  key: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

export interface FilterBarSearch {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface FilterBarProps {
  filters: FilterBarFilter[]
  search?: FilterBarSearch
  onClear?: () => void
  activeCount?: number
  /** Label for the Clear button; default a minimal generic like 'Clear'. */
  clearLabel?: string
  className?: string
  children?: React.ReactNode
}

function FilterBar({
  filters,
  search,
  onClear,
  activeCount,
  clearLabel,
  className,
  children,
}: FilterBarProps) {
  const { t } = useTranslation('common')
  const showCount = typeof activeCount === 'number' && activeCount > 0

  return (
    <div
      data-slot="filter-bar"
      role={search ? 'search' : undefined}
      className={cn(
        'flex flex-wrap items-end gap-[var(--space-2,0.5rem)] sm:gap-[var(--space-3,0.75rem)]',
        className,
      )}
    >
      {filters.map((filter) => (
        <Combobox
          key={filter.key}
          label={filter.label}
          value={filter.value}
          onValueChange={filter.onChange}
          options={filter.options}
          placeholder={filter.placeholder}
          wrapperClassName="min-w-[8rem]"
          clearable
        />
      ))}

      {search ? (
        <SearchInput
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          placeholder={search.placeholder}
          wrapperClassName="min-w-[12rem] flex-1"
        />
      ) : null}

      {(onClear || showCount) && (
        <div className="flex items-center gap-1.5">
          {onClear ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              {clearLabel ?? 'Clear'}
              {showCount ? (
                <Badge variant="secondary" className="ml-1">
                  {activeCount}
                </Badge>
              ) : null}
            </Button>
          ) : showCount ? (
            <Badge variant="secondary">
              <span aria-hidden="true">{activeCount}</span>
              <span className="sr-only">
                {t('active_filters_count', { count: activeCount })}
              </span>
            </Badge>
          ) : null}
        </div>
      )}

      {children}
    </div>
  )
}
FilterBar.displayName = 'FilterBar'

export { FilterBar }
