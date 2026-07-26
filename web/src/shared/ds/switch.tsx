"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/shared/ds/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // `before` pseudo = invisible hit-slop so the pointer target is ≥24×24
        // without changing the supplied 44×25 iqbola visual track.
        "peer relative inline-flex h-[25px] w-11 shrink-0 items-center rounded-[20px] border border-transparent p-[3px] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] outline-none before:absolute before:-inset-y-1 before:-inset-x-0.5 before:content-[''] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--color-brand-500)] data-[state=unchecked]:bg-[var(--color-neutral-300)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[19px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-[var(--dur-fast)] data-[state=checked]:translate-x-[19px] data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
