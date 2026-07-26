import * as React from "react"

import { cn } from "@/shared/lib/utils"

/**
 * Default hard cap for free-text inputs. Without it, any field accepts
 * pathologically long input (e.g. a 1000-char "name" that breaks table rows and
 * confirm dialogs). It is a safety net, not the business rule: per-field Zod
 * schemas still enforce tighter limits (e.g. a subject name ≤ 80). 255 is
 * generous enough for names/addresses/most URLs; a field that needs more (a long
 * URL) can override with its own `maxLength`. The browser ignores `maxLength` for
 * number/date/etc. inputs, so this only affects text-like fields.
 */
export const DEFAULT_MAX_INPUT_LENGTH = 255

function Input({
  className,
  type,
  maxLength = DEFAULT_MAX_INPUT_LENGTH,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      maxLength={maxLength}
      className={cn(
        "h-11 w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-muted)] disabled:opacity-80 aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--color-danger-500)_18%,transparent)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
