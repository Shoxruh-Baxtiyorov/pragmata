import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { activeSite, api } from '@/shared/api/client'
import { Building2 } from '@/shared/ui/icons'
import { useMe } from '@/features/auth'
import { cn } from '@/shared/lib/utils'

interface SiteRow {
  id: number
  name: string
  tariff: string
  cameras: number
}

/**
 * Переключатель организаций для владельца платформы: клиентов смотрят по
 * одному, а не общим котлом. Клиенту не показывается вообще — у него одна
 * организация, и сервер всё равно игнорирует заголовок от не-админа.
 */
export function SiteSelect() {
  const { t } = useTranslation()
  const me = useMe()
  const isPlatform = me.data?.role === 'admin'

  const sites = useQuery({
    queryKey: ['sites'],
    queryFn: () => api.get<SiteRow[]>('/api/v1/backoffice/sites'),
    enabled: isPlatform,
    retry: false, // нет прав бэкофиса — молча прячем, а не долбим сервер
  })

  if (!isPlatform || !sites.data || sites.data.length === 0) return null

  const current = activeSite.get()

  return (
    <label
      className={cn(
        'flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-soft)] px-2.5',
        current && 'border-[var(--color-brand-500)] text-[var(--color-brand-text)]',
      )}
      title={t('site.switch')}
    >
      <Building2 size={16} className="shrink-0" />
      <select
        value={current}
        onChange={(e) => activeSite.set(e.target.value)}
        className="max-w-40 bg-transparent text-label font-semibold outline-none"
      >
        <option value="">{t('site.all')}</option>
        {sites.data.map((s) => (
          <option key={s.id} value={String(s.id)}>
            {s.name} ({s.cameras})
          </option>
        ))}
      </select>
    </label>
  )
}
