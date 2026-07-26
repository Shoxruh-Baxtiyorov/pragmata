import { type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

export interface SpinnerProps {
  size?: number
  className?: string
  'aria-label'?: string
}

// Inject keyframes once — no external CSS dependency.
if (typeof document !== 'undefined') {
  const KEY = 'ui-spin-keyframes'
  if (!document.getElementById(KEY)) {
    const s = document.createElement('style')
    s.id = KEY
    s.textContent = `
      @keyframes ui-spin { to { transform: rotate(360deg); } }
      @keyframes ui-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    `
    document.head.appendChild(s)
  }
}

export function Spinner({ size = 16, className, ...rest }: SpinnerProps) {
  const { t } = useTranslation('common')
  const border = Math.max(2, Math.round(size / 8))
  const style: CSSProperties = {
    width: size,
    height: size,
    borderWidth: border,
    borderStyle: 'solid',
    borderColor: 'currentColor',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'ui-spin 0.7s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  }
  return (
    <span
      role="status"
      aria-label={rest['aria-label'] ?? t('loading')}
      className={className}
      style={style}
    />
  )
}
Spinner.displayName = 'Spinner'
