import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/ds/utils'
import { MoreHorizontal } from '@/shared/ds/icons'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { IconButton, type IconButtonSize } from './icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

export interface RowAction {
  key: string
  label: ReactNode
  icon?: ReactNode
  onSelect: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export interface RowActionsProps {
  actions: RowAction[]
  /** aria-label for the trigger (e.g. i18n "Amallar"). Defaults to common "actions". */
  label?: string
  align?: 'start' | 'end'
}

/**
 * Single overflow trigger that opens a menu of labeled row actions.
 * Use when a table/list row has 3+ actions; for 1-2 actions prefer `IconAction`.
 */
function RowActions({ actions, label, align = 'end' }: RowActionsProps) {
  const { t } = useTranslation('common')
  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={label ?? t('actions')} size={32}>
          <MoreHorizontal className="size-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((a) => (
          <DropdownMenuItem
            key={a.key}
            disabled={a.disabled}
            variant={a.tone === 'danger' ? 'destructive' : 'default'}
            onSelect={() => a.onSelect()}
          >
            {a.icon}
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
RowActions.displayName = 'RowActions'

export interface IconActionProps {
  /** REQUIRED — tooltip text + aria-label. */
  label: string
  icon: ReactNode
  onClick?: () => void
  /** danger tints the icon with --color-status-error-text */
  tone?: 'default' | 'danger'
  disabled?: boolean
  size?: IconButtonSize
}

/**
 * A single icon button paired with a tooltip. Use for the 1-2 action case in a row.
 * Relies on the app-shell global TooltipProvider (DsProvider) — do not add another.
 */
function IconAction({ label, icon, onClick, tone = 'default', disabled, size = 32 }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton
          aria-label={label}
          disabled={disabled}
          size={size}
          onClick={onClick}
          className={cn(
            tone === 'danger' &&
              'text-[var(--color-status-error-text)] hover:text-[var(--color-status-error-text)]',
          )}
        >
          {icon}
        </IconButton>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
IconAction.displayName = 'IconAction'

export { RowActions, IconAction }
