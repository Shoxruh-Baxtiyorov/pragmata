"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Popover as PopoverPrimitive, Select as SelectPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, Loader2Icon } from '@/shared/ds/icons'

import { cn } from "@/shared/ds/utils"
import { SearchInput } from "./search-input"

/* -------------------------------------------------------------------------------------------------
 * Shared trigger styling
 *
 * Mirrors the look of the existing native `select.tsx` trigger so the new controls are visual
 * drop-ins. Kept here (not imported) because the task is additive and must not touch select.tsx.
 * -----------------------------------------------------------------------------------------------*/

const triggerVariants = cva(
  // Sizes/background deliberately mirror the DS `Input` (h-10, bg-transparent,
  // text-base) so a SelectField sitting next to an Input, DatePicker, or toolbar
  // Button in a row is pixel-identical in height and tone.
  // `[&>span]:min-w-0` is required alongside `truncate`: in a flex row a child's
  // default min-width is `auto` (content-based), so without it a long value (e.g.
  // a full name with patronymic) overflows into the chevron instead of ellipsizing.
  // `min-w-0` on the trigger itself is load-bearing: Radix Select renders a
  // hidden native <select> whose longest <option> sets a min-content width; with
  // the button's default `min-width:auto` that long option widens the trigger
  // past `w-full`, overflowing the surrounding modal/form. `min-w-0` lets the
  // button shrink to `w-full` so the value span (below) can ellipsize instead.
  "flex w-full min-w-0 appearance-none items-center justify-between gap-2 rounded-[var(--radius-md)] border bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] outline-none transition-colors duration-[var(--dur-fast)] data-placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] disabled:cursor-not-allowed disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-muted)] disabled:opacity-80 aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--color-danger-500)_18%,transparent)] [&>span]:min-w-0 [&>span]:truncate",
  {
    variants: {
      variant: {
        default: "border-[var(--color-border-strong)]",
        filled: "border-transparent bg-[var(--color-bg-muted)] shadow-none",
        ghost: "border-transparent bg-transparent shadow-none hover:bg-[var(--color-bg-muted)]",
      },
      size: {
        // Selects must always match form inputs (the DS Input is h-10), so the
        // former compact size is retired: "sm" aliases the default height.
        // Existing size="sm" call-sites (filters, branch pickers) line up with
        // inputs and toolbar buttons (also h-10) instead of being a different size.
        sm: "h-11 px-3 text-sm font-medium",
        default: "h-11 px-3 text-sm font-medium",
        lg: "h-12 px-3.5 text-[15px] font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

type TriggerVariantProps = VariantProps<typeof triggerVariants>

/* -------------------------------------------------------------------------------------------------
 * Radix Select primitives (composable parts)
 * -----------------------------------------------------------------------------------------------*/

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size,
  variant,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & TriggerVariantProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(triggerVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon
          aria-hidden
          className="size-3 shrink-0 text-muted-foreground"
          strokeWidth={2.5}
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1 text-muted-foreground",
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
          className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] p-1 text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] duration-[var(--dur-normal)] data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          // Prevent overflow on mobile: cap width to viewport minus safe margins
          "max-w-[calc(100vw-1rem)]",
          position === "popper" &&
            "w-(--radix-select-trigger-width) data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-0",
            position === "popper" &&
              "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1 text-xs font-bold text-[var(--color-text-muted)]", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-[var(--radius-sm)] py-2 pr-8 pl-2 text-sm font-semibold outline-hidden select-none focus:bg-[var(--color-brand-50)] focus:text-[var(--color-brand-text)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-[var(--color-border-soft)]", className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Shared field composition (label + hint/error + aria wiring)
 * -----------------------------------------------------------------------------------------------*/

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

interface FieldShellProps {
  controlId: string
  label?: string
  required?: boolean
  hint?: string
  error?: string
  wrapperClassName?: string
  children: (a11y: {
    describedBy: string | undefined
    invalid: boolean
  }) => React.ReactNode
}

/**
 * Internal helper that renders the label, the control (via render prop so it can receive the
 * computed `aria-describedby`/`aria-invalid`), and the hint/error region. Mirrors the exact
 * label/hint/error composition + describedby wiring from the existing `select.tsx`.
 */
function FieldShell({
  controlId,
  label,
  required,
  hint,
  error,
  wrapperClassName,
  children,
}: FieldShellProps) {
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const describedBy =
    [error ? errorId : hint ? hintId : undefined].filter(Boolean).join(" ") ||
    undefined

  return (
    <div className={cn("grid gap-1.5", wrapperClassName)}>
      {label && (
        <label
          htmlFor={controlId}
          className="text-[12.5px] leading-none font-bold text-[var(--color-text-secondary)]"
        >
          {label}
          {required && (
            <span className="text-[var(--color-trend-negative)] ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}
      {children({ describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <span id={hintId} className="text-xs font-medium leading-relaxed text-[var(--color-text-muted)]">
          {hint}
        </span>
      )}
      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-xs leading-relaxed text-[var(--color-status-error-text)]"
        >
          {error}
        </span>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * SelectField — convenience wrapper around the Radix Select parts
 * -----------------------------------------------------------------------------------------------*/

export interface SelectFieldProps extends TriggerVariantProps {
  label?: string
  required?: boolean
  hint?: string
  error?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  options?: ComboboxOption[]
  children?: React.ReactNode
  disabled?: boolean
  /** When true, clicking the already-selected option resets to the FIRST option
   *  (the conventional "all"/Barchasi) — a toggle-off without a separate Clear
   *  button. Opt-in so normal/required selects keep their value on re-click. */
  clearable?: boolean
  id?: string
  name?: string
  'aria-label'?: string
  wrapperClassName?: string
  className?: string
}

function SelectField({
  label,
  required,
  hint,
  error,
  placeholder,
  value,
  onValueChange,
  options,
  children,
  variant,
  size,
  disabled,
  id,
  name,
  clearable,
  'aria-label': ariaLabel,
  wrapperClassName,
  className,
}: SelectFieldProps) {
  const generatedId = React.useId()
  const controlId = id ?? generatedId
  const resetValue = options && options.length > 0 ? options[0].value : ''

  return (
    <FieldShell
      controlId={controlId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
    >
      {({ describedBy, invalid }) => (
        <Select
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          name={name}
        >
          <SelectTrigger
            id={controlId}
            variant={variant}
            size={size}
            className={className}
            aria-label={ariaLabel}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          >
            {/* Own truncating wrapper: a long option (e.g. a subject name with
                no spaces) must ellipsize instead of widening the trigger and
                breaking the surrounding modal/form layout. */}
            <span className="min-w-0 flex-1 truncate text-left">
              <SelectValue placeholder={placeholder} />
            </span>
          </SelectTrigger>
          <SelectContent>
            {options
              ? options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    // Toggle-off: re-clicking the selected option (when clearable
                    // and it isn't already the "all" first option) resets to the
                    // first option. Radix re-selects the same value without firing
                    // onValueChange and just closes, so we drive the reset here.
                    onClick={
                      clearable && value === option.value && option.value !== resetValue
                        ? () => onValueChange?.(resetValue)
                        : undefined
                    }
                  >
                    {option.label}
                  </SelectItem>
                ))
              : children}
          </SelectContent>
        </Select>
      )}
    </FieldShell>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Combobox — filterable single-select built on Popover (Radix Select can't host a filter input)
 * -----------------------------------------------------------------------------------------------*/

export interface ComboboxProps extends TriggerVariantProps {
  value?: string
  onValueChange?: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  label?: string
  required?: boolean
  hint?: string
  error?: string
  disabled?: boolean
  /** Shows a spinner in place of the chevron and disables the trigger. */
  loading?: boolean
  /** When true, re-selecting the current option resets to the FIRST option
   *  (toggle-off). Single-select only; ignored when `multiple`. */
  clearable?: boolean
  id?: string
  name?: string
  'aria-label'?: string
  wrapperClassName?: string
  className?: string
  /** Extra classes for the portaled popover panel (the dropdown list). Optional
   *  and default-empty, so panels keep the trigger-width look unless a call-site
   *  opts in — e.g. a compact pill trigger whose full option labels would
   *  otherwise clip can floor the panel width here. */
  contentClassName?: string
  // Multi-select mode. When `multiple` is true, selection is read/written via
  // `values`/`onValuesChange`; `clearable`/`value`/`onValueChange` are ignored.
  multiple?: boolean
  values?: string[]
  onValuesChange?: (values: string[]) => void
}

function Combobox({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  label,
  required,
  hint,
  error,
  variant,
  size,
  disabled,
  loading,
  clearable,
  id,
  name,
  'aria-label': ariaLabel,
  wrapperClassName,
  className,
  contentClassName,
  multiple,
  values,
  onValuesChange,
}: ComboboxProps) {
  const { t } = useTranslation('common')
  // Param defaults can't reference `t` (it's created in the body), so resolve
  // the i18n fallbacks here instead of in the parameter list.
  const resolvedPlaceholder = placeholder ?? t('combobox_placeholder')
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('combobox_search_placeholder')
  const resolvedEmptyText = emptyText ?? t('combobox_no_results')

  const generatedId = React.useId()
  const controlId = id ?? generatedId
  const listboxId = `${controlId}-listbox`

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const optionRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const listboxRef = React.useRef<HTMLDivElement>(null)

  // When this popover opens inside a modal, the dialog's scroll-lock
  // (react-remove-scroll) attaches a non-passive `wheel` listener on `document`
  // that cancels scrolling for content portaled outside the dialog — which is
  // where this list lives — so the mouse wheel can't scroll the options. Stop
  // wheel/touchmove at the list element: in the bubble phase this fires before
  // `document`, so the lock never sees it and the list's own overflow container
  // scrolls natively. Attached as a native listener (not React's delegated
  // onWheel, which is dispatched too late to win that race) via a CALLBACK ref:
  // an effect keyed on `open` runs while Radix's Portal still renders null (the
  // portal mounts its content one layout-effect re-render later), so it would
  // see a null ref, bail, and never re-run — the listener must attach at the
  // moment the node itself mounts.
  const stopScrollPropagation = React.useCallback((event: Event) => {
    event.stopPropagation()
  }, [])
  const setListboxNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      const prev = listboxRef.current
      if (prev) {
        prev.removeEventListener('wheel', stopScrollPropagation)
        prev.removeEventListener('touchmove', stopScrollPropagation)
      }
      listboxRef.current = node
      if (node) {
        node.addEventListener('wheel', stopScrollPropagation, { passive: false })
        node.addEventListener('touchmove', stopScrollPropagation, { passive: false })
      }
    },
    [stopScrollPropagation],
  )

  const selectedValues = React.useMemo(() => values ?? [], [values])
  const isOptionSelected = React.useCallback(
    (option: ComboboxOption) =>
      multiple ? selectedValues.includes(option.value) : option.value === value,
    [multiple, selectedValues, value],
  )

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  )

  // Trigger label: single = the selected option's label; multiple = the
  // comma-joined labels of every selected option in `options` order (not
  // selection order). Falls back to `placeholder` when nothing is selected.
  const hasSelection = multiple ? selectedValues.length > 0 : Boolean(selectedOption)
  const displayLabel = multiple
    ? selectedValues.length > 0
      ? options
          .filter((option) => selectedValues.includes(option.value))
          .map((option) => option.label)
          .join(", ")
      : resolvedPlaceholder
    : selectedOption
      ? selectedOption.label
      : resolvedPlaceholder

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => option.label.toLowerCase().includes(q))
  }, [options, query])

  // Keep the active index within bounds whenever the filtered list changes.
  React.useEffect(() => {
    setActiveIndex((current) => {
      if (filtered.length === 0) return 0
      return Math.min(current, filtered.length - 1)
    })
  }, [filtered.length])

  // When opening, reset the query and point the active item at the current value (if visible).
  React.useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    const selectedIdx = options.findIndex((option) => option.value === value)
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0)
  }, [open, options, value])

  // Keep the active option scrolled into view as the user navigates.
  React.useEffect(() => {
    if (!open) return
    const node = optionRefs.current[activeIndex]
    node?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open])

  const commit = React.useCallback(
    (option: ComboboxOption | undefined) => {
      if (!option || option.disabled) return
      if (multiple) {
        // Toggle the option in/out of the selection; stay open (only Escape or
        // an outside click closes the popover in multi mode).
        const next = selectedValues.includes(option.value)
          ? selectedValues.filter((v) => v !== option.value)
          : [...selectedValues, option.value]
        onValuesChange?.(next)
        return
      }
      // Toggle-off (clearable, single-select): re-selecting the current value
      // resets to the first/"all" option — or is a no-op when it's already that
      // option (mirrors SelectField's clearable semantics: re-clicking the
      // reset target does not re-fire onValueChange).
      const resetValue = options[0]?.value ?? ""
      if (clearable && option.value === value) {
        if (option.value !== resetValue) onValueChange?.(resetValue)
        setOpen(false)
        return
      }
      onValueChange?.(option.value)
      setOpen(false)
    },
    [multiple, selectedValues, onValuesChange, clearable, options, value, onValueChange],
  )

  const moveActive = React.useCallback(
    (delta: number) => {
      if (filtered.length === 0) return
      setActiveIndex((current) => {
        let next = current
        for (let i = 0; i < filtered.length; i += 1) {
          next = (next + delta + filtered.length) % filtered.length
          if (!filtered[next]?.disabled) break
        }
        return next
      })
    },
    [filtered],
  )

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        moveActive(1)
        break
      case "ArrowUp":
        event.preventDefault()
        moveActive(-1)
        break
      case "Home":
        event.preventDefault()
        setActiveIndex(0)
        break
      case "End":
        event.preventDefault()
        setActiveIndex(filtered.length - 1)
        break
      case "Enter":
        event.preventDefault()
        commit(filtered[activeIndex])
        break
      case "Escape":
        event.preventDefault()
        setOpen(false)
        break
      default:
        break
    }
  }

  const activeOptionId =
    open && filtered[activeIndex]
      ? `${controlId}-option-${activeIndex}`
      : undefined

  return (
    <FieldShell
      controlId={controlId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
    >
      {({ describedBy, invalid }) => (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
          {name &&
            (multiple ? (
              selectedValues.map((v) => (
                <input key={v} type="hidden" name={name} value={v} />
              ))
            ) : (
              <input type="hidden" name={name} value={value ?? ""} />
            ))}
          {/* Plain disclosure button: the real combobox semantics live on the
              filter input inside the popover — a second `role="combobox"` here
              would be an invalid role split (WCAG 4.1.2). */}
          <PopoverPrimitive.Trigger
            data-slot="combobox-trigger"
            type="button"
            id={controlId}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-label={ariaLabel}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            aria-busy={loading || undefined}
            disabled={disabled || loading}
            data-placeholder={hasSelection ? undefined : ""}
            className={cn(triggerVariants({ variant, size }), className)}
          >
            <span className={cn("min-w-0 flex-1 truncate text-left", !hasSelection && "text-[var(--color-text-muted)]")}>
              {displayLabel}
            </span>
            {loading ? (
              <Loader2Icon
                aria-hidden
                className="size-3 shrink-0 animate-spin"
              />
            ) : (
              <ChevronDownIcon
                aria-hidden
                className="size-3 shrink-0 text-muted-foreground"
                strokeWidth={2.5}
              />
            )}
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              data-slot="combobox-content"
              align="start"
              sideOffset={4}
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                inputRef.current?.focus()
              }}
              className={cn(
                "z-50 w-(--radix-popover-trigger-width) origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] p-1 text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] outline-hidden",
                "max-w-[calc(100vw-1rem)] duration-[var(--dur-normal)] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                contentClassName,
              )}
            >
              {/* One visual field: SearchInput renders the icon INSIDE the DS
                  Input's border (same look as page-level search bars), instead
                  of an icon floating next to a separately-outlined input. Both
                  layers spread props, so the combobox ref/role/aria wiring
                  lands on the native input. */}
              <SearchInput
                ref={inputRef}
                data-slot="combobox-input"
                role="combobox"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={resolvedSearchPlaceholder}
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={activeOptionId}
                className="h-9"
              />
              <div
                ref={setListboxNode}
                id={listboxId}
                role="listbox"
                aria-multiselectable={multiple || undefined}
                className="mt-1 max-h-60 overflow-x-hidden overflow-y-auto overscroll-contain"
              >
                {filtered.length === 0 ? (
                  <div className="px-2 py-2 text-center text-sm font-medium text-[var(--color-text-muted)]">
                    {resolvedEmptyText}
                  </div>
                ) : (
                  filtered.map((option, index) => {
                    const isSelected = isOptionSelected(option)
                    const isActive = index === activeIndex
                    return (
                      <div
                        key={option.value}
                        ref={(node) => {
                          optionRefs.current[index] = node
                        }}
                        id={`${controlId}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        data-active={isActive || undefined}
                        data-disabled={option.disabled || undefined}
                        onPointerDown={(event) => {
                          // Prevent the popover trigger from stealing focus / closing first.
                          event.preventDefault()
                        }}
                        onClick={() => commit(option)}
                        onPointerMove={() => setActiveIndex(index)}
                        className={cn(
                          "relative flex cursor-default items-center gap-1.5 rounded-[var(--radius-sm)] py-2 pr-8 pl-2 text-sm font-semibold outline-hidden select-none data-active:bg-[var(--color-brand-50)] data-active:text-[var(--color-brand-text)] data-disabled:pointer-events-none data-disabled:opacity-50",
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected && (
                          <span className="absolute right-2 flex items-center justify-center">
                            <CheckIcon className="size-4" />
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      )}
    </FieldShell>
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  SelectField,
  Combobox,
}
