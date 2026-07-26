"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon, Minus } from '@/shared/ds/icons'

import { cn } from "@/shared/ds/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // `before` pseudo = invisible hit-slop so the pointer target is ≥24×24
        // (WCAG 2.5.8) without growing the 16px visual box: 16 + 2×6 = 28px.
        "peer relative size-4 shrink-0 rounded-[4px] border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-xs)] outline-none transition-shadow before:absolute before:-inset-1.5 before:content-[''] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--color-brand-500)] data-[state=checked]:bg-[var(--color-brand-500)] data-[state=checked]:text-white data-[state=indeterminate]:border-[var(--color-brand-500)] data-[state=indeterminate]:bg-[var(--color-brand-500)] data-[state=indeterminate]:text-white aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--color-danger-500)_18%,transparent)]",
        className,
      )}
      {...props}
    >
      {/* Radix renders the indicator for BOTH the checked and indeterminate
          states and stamps it with data-state; CSS picks the matching glyph
          (check vs minus) so `checked="indeterminate"` reads as "partially
          selected" instead of a full check. */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5 group-data-[state=indeterminate]:hidden" />
        <Minus className="hidden size-3.5 group-data-[state=indeterminate]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
