import * as React from "react"
import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/ds/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[var(--radius-pill)] border border-transparent px-2.5 py-0.5 text-xs font-bold whitespace-nowrap transition-all duration-[var(--dur-fast)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-brand-ring)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-[color-mix(in_srgb,var(--color-danger-500)_20%,transparent)] [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-brand-500)] text-white [a]:hover:bg-[var(--color-brand-600)]",
        secondary:
          "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] [a]:hover:bg-[var(--color-neutral-100)]",
        destructive:
          "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] focus-visible:ring-[color-mix(in_srgb,var(--color-danger-500)_20%,transparent)] [a]:hover:bg-[color-mix(in_srgb,var(--color-danger-500)_16%,transparent)]",
        outline:
          "border-[var(--color-border-strong)] text-[var(--color-text-primary)] [a]:hover:bg-[var(--color-bg-muted)] [a]:hover:text-[var(--color-text-primary)]",
        ghost:
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]",
        link: "text-[var(--color-brand-text)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export type StatusBadgeTone = "success" | "warning" | "error" | "info" | "neutral"

export interface StatusBadgeProps {
  tone: StatusBadgeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
  /**
   * Flat pill: drop the tinted tone border (→ transparent) and ease the weight
   * to medium, so the badge reads as a soft fill instead of a hard-outlined
   * chip. Keeps the same token-driven bg/text. Use for dense catalog tables
   * (e.g. behavior reasons) where the bordered chip looks too heavy.
   */
  soft?: boolean
}

// Token-driven per-tone bg/text/border. Pairs icon + text + color so meaning
// never relies on color alone. Standalone — intentionally NOT routed through
// badgeVariants (those belong to the existing Badge).
const STATUS_BADGE_TONE: Record<StatusBadgeTone, string> = {
  success:
    "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]",
  warning:
    "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]",
  error:
    "bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)] border-[var(--color-status-error-border)]",
  info: "bg-[var(--color-status-info-bg)] text-[var(--color-status-info-text)] border-[var(--color-status-info-border)]",
  neutral:
    "bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral-text)] border-[var(--color-status-neutral-border)]",
}

function StatusBadge({ tone, icon, children, className, soft = false }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      data-soft={soft ? "" : undefined}
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1 whitespace-nowrap rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-bold [&>svg]:size-3.5",
        STATUS_BADGE_TONE[tone],
        // twMerge keeps the last conflicting utility, so these override the
        // tone's border color + the base font-bold when `soft` is set.
        soft && "border-transparent font-medium",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
StatusBadge.displayName = "StatusBadge"

export { Badge, badgeVariants, StatusBadge }
