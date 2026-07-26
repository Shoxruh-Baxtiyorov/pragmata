import { useTranslation } from 'react-i18next'
import { Button } from './button'

export interface RetryButtonProps {
  onRetry?: () => void
  label?: string
}

export function RetryButton({ onRetry, label }: RetryButtonProps) {
  const { t } = useTranslation('common')
  // No aria-label override: the visible text IS the accessible name, so it can
  // never violate Label-in-Name (WCAG 2.5.3) regardless of `label` or locale.
  return (
    <Button variant="secondary" size="sm" onClick={onRetry}>
      {label ?? t('retry')}
    </Button>
  )
}
RetryButton.displayName = 'RetryButton'
