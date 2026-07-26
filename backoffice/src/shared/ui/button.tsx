import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none select-none focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--color-danger-500)] aria-invalid:ring-3 aria-invalid:ring-[color-mix(in_srgb,var(--color-danger-500)_20%,transparent)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-brand-500)] text-white shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-600)] [a]:hover:bg-[var(--color-brand-600)]",
        outline:
          "border-[var(--color-border-strong)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-bg-muted)] aria-expanded:bg-[var(--color-bg-muted)]",
        secondary:
          "bg-[var(--color-bg-muted)] text-[var(--color-text-primary)] hover:bg-[var(--color-neutral-100)] aria-expanded:bg-[var(--color-neutral-100)]",
        ghost:
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)] aria-expanded:bg-[var(--color-bg-muted)] aria-expanded:text-[var(--color-text-primary)]",
        destructive:
          "bg-[var(--color-danger-500)] text-white shadow-[var(--shadow-danger)] hover:bg-[var(--color-danger-600)] focus-visible:border-[var(--color-danger-500)] focus-visible:ring-[color-mix(in_srgb,var(--color-danger-500)_20%,transparent)]",
        link: "text-[var(--color-brand-text)] underline-offset-4 hover:text-[var(--color-brand-text-hover)] hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-[var(--radius-sm)] px-2 text-xs in-data-[slot=button-group]:rounded-[var(--radius-md)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-[var(--radius-md)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-[var(--radius-md)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-5 text-[15px] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        // `before` pseudo = invisible hit-slop: the 24px visual box gets a
        // ≥24px pointer target with margin (WCAG 2.5.8) without growing.
        "icon-xs":
          "relative size-7 rounded-[var(--radius-sm)] before:absolute before:-inset-1 before:content-[''] in-data-[slot=button-group]:rounded-[var(--radius-md)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-[var(--radius-md)] in-data-[slot=button-group]:rounded-[var(--radius-md)]",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  // Dev-only guard (M11/WCAG 4.1.2): icon-size buttons have no visible text, so
  // they need an explicit accessible name. Warn once per mount when neither the
  // button nor (for `asChild`) its child element provides one.
  const warnedRef = React.useRef(false)
  React.useEffect(() => {
    if (!import.meta.env.DEV || warnedRef.current) return
    if (typeof size !== "string" || !size.startsWith("icon")) return
    const candidates: Record<string, unknown>[] = [
      props as unknown as Record<string, unknown>,
    ]
    if (asChild && React.isValidElement(props.children)) {
      candidates.push(props.children.props as Record<string, unknown>)
    }
    const hasAccessibleName = candidates.some(
      (p) =>
        p["aria-label"] != null ||
        p["aria-labelledby"] != null ||
        typeof p["children"] === "string",
    )
    if (!hasAccessibleName) {
      warnedRef.current = true
      console.warn(
        `[Button] size="${size}" renders an icon-only button without an accessible name. ` +
          "Add aria-label/aria-labelledby (or use IconButton, which requires one).",
      )
    }
    // mount-only dev check
  }, [])

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
