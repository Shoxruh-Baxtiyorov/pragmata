import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

// Постраничная навигация: ← Назад · «Стр. X из Y» · Вперёд →. Прячется при 1 странице.
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <div className={cn('flex items-center justify-center gap-3 pt-3', className)}>
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← {t('common.prev')}
      </Button>
      <span className="min-w-24 text-center text-label tabular-nums text-[var(--color-text-secondary)]">
        {t('common.page', { page, total: totalPages })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t('common.next')} →
      </Button>
    </div>
  )
}
