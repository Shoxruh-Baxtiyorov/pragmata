import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

export { Button } from './button'
export { Input } from './input'
export { Card } from './card'
export { Badge } from './badge'
export { Modal } from './modal'

export function Spinner() {
  return <Loader2 className="size-6 animate-spin text-brand" />
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-h2">{title}</h1>
      {actions}
    </div>
  )
}

export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-s">
      <div className="text-label text-text-secondary">{label}</div>
      <div className="mt-1 text-h1 font-mono">{value}</div>
    </div>
  )
}

export function EmptyState({ text }: { text?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-text-secondary">
      {text ?? t('common.empty')}
    </div>
  )
}

// Заглушка раздела — используется всеми ещё не реализованными фичами
export function PlaceholderPage({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState text={t('common.stub')} />
    </div>
  )
}
