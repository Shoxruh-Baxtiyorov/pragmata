import { DigestText } from '../components/DigestText'
import { useTranslation } from 'react-i18next'
import { Card, EmptyState, PageHeader, Skeleton, SkeletonTiles, StatTile } from '@/shared/ui'
import { eventLabel, type EventType } from '@/shared/lib/format'
import { eventIcon } from '@/shared/ui/icons'
import { useDigest, useStats } from '../api/insightsApi'

// Горизонтальные бары в стиле HourlyBars — чистый CSS, без графических библиотек.
function Bars({ data, labelType, lang }: { data: Record<string, number>; labelType?: boolean; lang: 'ru' | 'uz' | 'en' }) {
  const max = Math.max(1, ...Object.values(data))
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-2.5">
      {rows.map(([k, v]) => {
        const Icon = labelType ? eventIcon[k as EventType] : null
        return (
          <div key={k} className="flex items-center gap-3">
            <span className="flex w-44 shrink-0 items-center gap-1.5 truncate text-body text-text-secondary" title={k}>
              {Icon && <Icon size={16} className="shrink-0 text-text-secondary" />}
              <span className="truncate">{labelType ? eventLabel(k, lang) : k}</span>
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-pill bg-bg-secondary">
              <div className="h-full rounded-pill bg-brand" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-body">{v}</span>
          </div>
        )
      })}
    </div>
  )
}

export function StatsPage() {
  const { t, i18n } = useTranslation()
  const lang = (['ru', 'uz', 'en'].includes(i18n.language) ? i18n.language : 'uz') as 'ru' | 'uz' | 'en'
  const stats = useStats(24)
  const digest = useDigest(24, lang)

  if (stats.isLoading)
    return (
      <div className="space-y-4">
        <SkeletonTiles count={3} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    )
  if (stats.isError || !stats.data) return <EmptyState text={t('common.noConnection')} onRetry={stats.refetch} />

  return (
    <div className="space-y-4">
      <PageHeader title={t('stats.title')} subtitle={t('stats.subtitle')} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={t('stats.visitors')} value={stats.data.visitors_entered} />
        <StatTile label={t('stats.alerts')} value={stats.data.alerts} />
        <StatTile label={t('stats.fp')} value={stats.data.false_positives} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-h4">{t('stats.byType')}</h2>
          <Bars data={stats.data.by_type} labelType lang={lang} />
        </Card>
        <Card>
          <h2 className="mb-4 text-h4">{t('stats.byCamera')}</h2>
          <Bars data={stats.data.by_camera} lang={lang} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-h4">{t('stats.digest')}</h2>
        {digest.isError ? (
          <EmptyState text={t('common.noConnection')} onRetry={digest.refetch} />
        ) : digest.data ? (
          <DigestText text={digest.data.text} />
        ) : (
          <Skeleton className="h-40" />
        )}
      </Card>
    </div>
  )
}
