import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/shared/ds/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // Mobile: overflow-x scrollable strip with momentum scroll; no text shrink
  "group/tabs-list inline-flex w-full items-center justify-start rounded-[var(--radius-md)] p-1 text-[var(--color-text-muted)] group-data-horizontal/tabs:h-auto group-data-horizontal/tabs:overflow-x-auto group-data-horizontal/tabs:[scrollbar-width:none] group-data-horizontal/tabs:[-webkit-overflow-scrolling:touch] sm:group-data-horizontal/tabs:h-10 sm:group-data-horizontal/tabs:w-fit sm:group-data-horizontal/tabs:justify-center group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-bg-muted)]",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Mobile: flex-none so tabs don't compress in scroll container; min touch height h-10 (40px)
        "relative inline-flex h-10 flex-none sm:flex-1 sm:h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-transparent px-3 sm:px-3 py-0.5 text-sm font-bold whitespace-nowrap text-[var(--color-text-muted)] transition-all duration-[var(--dur-fast)] group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:border-[var(--color-brand-500)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-brand-ring)] focus-visible:outline-1 focus-visible:outline-[var(--color-brand-500)] disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 group-data-[variant=default]/tabs-list:data-active:shadow-[var(--shadow-xs)] group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-[var(--color-bg-surface)] data-active:text-[var(--color-brand-text)]",
        "after:absolute after:bg-[var(--color-brand-500)] after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
