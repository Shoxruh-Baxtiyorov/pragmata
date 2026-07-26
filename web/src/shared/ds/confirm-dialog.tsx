"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { Button } from "./button"
import { Input } from "./input"

/**
 * Project-wide confirmation modal primitive. Every destructive action
 * (delete, bulk delete, irreversible status change) MUST route through
 * this component — we do not fire mutations on a bare click.
 *
 * Port of the legacy `@/components/ConfirmDialog` onto the DS Dialog —
 * the prop API is unchanged so call sites only swap the import. Radix
 * supplies what the legacy file hand-rolled: focus trap, Escape,
 * backdrop close, scroll lock, and focus restoration to the opener.
 */
export interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Body content (original prop). Alias: `description`. */
  body?: React.ReactNode
  /** Plain-text description (new spec). Used when `body` is absent. */
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Visual intent — original prop. */
  tone?: 'danger' | 'warning' | 'primary'
  /** New-spec alias for `tone`. `destructive` === `danger`. */
  variant?: 'default' | 'destructive'
  /** Disable both buttons while the mutation is in flight. */
  busy?: boolean
  /** When set, user must type this exact string to enable the confirm button. */
  requireTypedConfirmation?: string
  onConfirm: () => void
  /** Original cancel handler. */
  onCancel?: () => void
  /** New-spec alias. Fires on backdrop click, Esc, and Cancel button. */
  onClose?: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  description,
  confirmLabel,
  cancelLabel,
  tone,
  variant,
  busy = false,
  requireTypedConfirmation,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common')
  const resolvedTone: 'danger' | 'warning' | 'primary' =
    tone ?? (variant === 'destructive' ? 'danger' : variant === 'default' ? 'primary' : 'danger')
  const resolvedConfirmLabel = confirmLabel ?? t('confirm')
  const resolvedCancelLabel = cancelLabel ?? t('cancel')

  const confirmRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [typed, setTyped] = React.useState('')
  const typedMatches = !requireTypedConfirmation || typed === requireTypedConfirmation

  const close = () => {
    onCancel?.()
    onClose?.()
  }

  // Reset the typed-confirmation gate every time the dialog opens.
  React.useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const bodyContent = body ?? description

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close() }}>
      <DialogContent
        className="sm:max-w-[440px]"
        showCloseButton={false}
        // Match legacy focus behavior: typed-confirmation input first,
        // otherwise the confirm button.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(inputRef.current ?? confirmRef.current)?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {bodyContent && (
            // Break long unbroken strings (e.g. a pasted/legacy name with no
            // spaces) and cap height so a huge interpolated value can't overflow
            // the dialog or push the action buttons off-screen.
            <DialogDescription className="max-h-[40vh] overflow-y-auto [overflow-wrap:anywhere]">
              {bodyContent}
            </DialogDescription>
          )}
        </DialogHeader>
        {requireTypedConfirmation && (
          <div className="grid gap-1.5">
            <label className="text-[13px] text-[var(--color-text-secondary)]">
              {t('typed_confirmation_prompt.prefix')} <strong>{requireTypedConfirmation}</strong> {t('typed_confirmation_prompt.suffix')}
            </label>
            <Input
              ref={inputRef}
              data-confirm-input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={close}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            {resolvedCancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={resolvedTone === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={busy || !typedMatches}
            className="w-full sm:w-auto"
          >
            {resolvedConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
