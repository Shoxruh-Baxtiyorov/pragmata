import * as React from "react"

import { cn } from "@/shared/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] outline-none placeholder:text-[var(--color-text-muted)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-muted)] disabled:opacity-80 aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--color-danger-500)_18%,transparent)]",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
