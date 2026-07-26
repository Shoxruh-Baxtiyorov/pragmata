"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { CircleIcon } from '@/shared/ds/icons'

import { cn } from "@/shared/ds/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        // `before` pseudo = invisible hit-slop so the pointer target is ≥24×24
        // (WCAG 2.5.8) without growing the 16px visual box: 16 + 2×6 = 28px.
        "relative aspect-square size-4 shrink-0 rounded-full border border-[var(--color-border-strong)] text-[var(--color-brand-500)] shadow-[var(--shadow-xs)] outline-none transition-shadow before:absolute before:-inset-1.5 before:content-[''] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--color-brand-500)] aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--color-danger-500)_18%,transparent)]",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-[var(--color-brand-500)] text-[var(--color-brand-500)]" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
