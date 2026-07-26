"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useTranslation } from "react-i18next"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { AlertTriangle, XIcon } from '@/shared/ui/icons'

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-[rgba(31,37,48,0.22)] duration-[var(--dur-normal)] supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  overlayClassName,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /** Escape hatch for the scrim — mainly `backdrop-blur-none`. Blurring the whole
   *  viewport is expensive on a dense page, and every repaint inside the dialog
   *  makes the compositor redo that blur, which is felt as jank while scrolling a
   *  long list (the command palette). */
  overlayClassName?: string
}) {
  const { t } = useTranslation('common')
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] p-5 text-sm font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-modal)] duration-[var(--dur-normal)] outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-2 right-2"
              size="icon-sm"
              aria-label={t('close')}
            >
              <XIcon
              />
              <span className="sr-only">{t('close')}</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const { t } = useTranslation('common')
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-5 -mb-5 flex flex-col-reverse gap-2 rounded-b-[var(--radius-xl)] border-t border-[var(--color-border-soft)] bg-[var(--color-row-alt)] p-5 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">{t('close')}</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-extrabold text-[var(--color-text-primary)]",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm font-medium text-[var(--color-text-muted)] *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-[var(--color-text-primary)]",
        className
      )}
      {...props}
    />
  )
}

export type FormFieldProps = {
  label: React.ReactNode
  children: React.ReactElement<{
    id?: string
    "aria-describedby"?: string
    "aria-invalid"?: boolean
  }>
  id?: string
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  className?: string
  labelClassName?: string
}

function FormField({
  label,
  children,
  id,
  hint,
  error,
  required,
  className,
  labelClassName,
}: FormFieldProps) {
  const generatedId = React.useId()
  const fieldId = id ?? children.props.id ?? generatedId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy = [
    children.props["aria-describedby"],
    error ? errorId : hint ? hintId : undefined,
  ].filter(Boolean).join(" ") || undefined

  return (
    // content-start: without it a grid-cell-stretched FormField (e.g. two
    // fields sharing a row where only one has a hint) distributes the extra
    // height into its OWN rows, pushing the control down — the neighbouring
    // fields' inputs end up on different levels.
    <div data-slot="form-field" className={cn("grid content-start gap-1.5", className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          "text-sm font-bold leading-none text-[var(--color-text-primary)]",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          labelClassName
        )}
      >
        {label}
        {required && (
          <span aria-hidden className="ml-1 text-[var(--color-status-error)]">
            *
          </span>
        )}
      </label>
      {React.cloneElement(children, {
        id: fieldId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })}
      {hint && !error && (
        <p id={hintId} className="m-0 text-xs leading-relaxed text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="m-0 text-xs leading-relaxed text-[var(--color-status-error-text)]"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export type FormModalSize = "sm" | "md" | "lg" | "xl"

export type FormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: FormModalSize
  className?: string
  bodyClassName?: string
  overlayClassName?: string
}

const FORM_MODAL_SIZE: Record<FormModalSize, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-3xl",
  lg: "sm:max-w-5xl",
  xl: "sm:max-w-7xl",
}

function FormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
  overlayClassName,
}: FormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // flex column + bounded height so the body scrolls instead of the
          // content overflowing past the viewport (tall forms were clipped and
          // their Login/RBAC fields + submit were unreachable).
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          FORM_MODAL_SIZE[size],
          className,
        )}
        overlayClassName={overlayClassName}
      >
        <DialogHeader className="shrink-0 border-b border-[var(--color-border-soft)] px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", bodyClassName)}>
          {children}
        </div>
        {/* DialogFooter's bleed assumes the default padded content;
            this content is p-0, so neutralize the negative margins or the
            buttons sit flush against the modal border. */}
        {footer && (
          <DialogFooter className="mx-0 mb-0 shrink-0 border-t border-[var(--color-border-soft)] px-5 py-3">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export type ErrorStateProps = {
  title?: React.ReactNode
  message?: React.ReactNode
  onRetry?: () => void
  retryLabel?: React.ReactNode
  className?: string
}

function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation('common')
  const resolvedTitle = title ?? t('error')
  const resolvedRetryLabel = retryLabel ?? t('retry')
  return (
    <section
      role="alert"
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-status-error-border)] bg-[var(--color-status-error-bg)] p-5 text-[var(--color-status-error-text)] shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-status-error)_18%,transparent)]"
        >
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-sm font-semibold leading-snug">{resolvedTitle}</h2>
          {message && (
            <p className="m-0 mt-1 text-sm leading-relaxed text-[var(--color-status-error-text)]">
              {message}
            </p>
          )}
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3">
              {resolvedRetryLabel}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  ErrorState,
  FormField,
  FormModal,
}
