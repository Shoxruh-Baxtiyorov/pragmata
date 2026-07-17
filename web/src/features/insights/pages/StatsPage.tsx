import { useTranslation } from 'react-i18next'
import { Card, CardContent, EmptyState, PageHeader, Spinner, StatTile } from '@/shared/ui'
import { eventLabel } from '@/shared/lib/format'
import { eventIcon, ShieldAlert, ShieldCheck, Users } from '@/shared/ui/icons'
import type { EventType } from '@/shared/api/types'
import { useDigest, useStats } from '../api/insightsApi'

function Bars({ data, labelType }: { data: Record<string, number>; labelType?: boolean }) {
  const { i18n } = useTranslation()
  const max = Math.max(1, ...Object.values(data))
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-2.5">
      {rows.map(([k, v]) => {
        const Icon = labelType ? eventIcon[k as EventType] : null
        return (
          <div key={k} className="flex items-center gap-3">
            <span className="flex w-44 flex-shrink-0 items-center gap-1.5 truncate text-sm text-[var(--color-text-secondary)]" title={k}>
              {Icon && <Icon size={14} className="flex-shrink-0 text-[var(--color-text-subtle)]" />}
              <span className="truncate">{labelType ? eventLabel(k, i18n.language) : k}</span>
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <div className="h-full rounded-full bg-[var(--color-brand-500)]" style={{ width: `${(v / max) * 100}%` }} />
            </div>
            <span className="w-10 flex-shrink-0 text-right font-mono text-sm font-medium">{v}</span>
          </div>
        )
      })}
    </div>
  )
}

export function StatsPage() {
  const { t } = useTranslation()
  const stats = useStats(24)
  const digest = useDigest(24)

  if (stats.isLoading) return <Spinner />
  if (stats.isError || !stats.data) return <EmptyState title={t('common.noConnection')} />

  return (
    <>
      <PageHeader title={t('stats.title')} subtitle={t('stats.subtitle')} />

      <div className="grid grid-cols-3 gap-4">
        <StatTile icon={Users} tone="brand" label={t('stats.visitors')} value={stats.data.visitors_entered} />
        <StatTile icon={ShieldAlert} tone="error" label={t('stats.alerts')} value={stats.data.alerts} />
        <StatTile icon={ShieldCheck} tone="warning" label={t('stats.fp')} value={stats.data.false_positives} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="mb-4 text-sm font-bold">{t('stats.byType')}</h2>
            <Bars data={stats.data.by_type} labelType />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="mb-4 text-sm font-bold">{t('stats.byCamera')}</h2>
            <Bars data={stats.data.by_camera} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent>
          <h2 className="mb-3 text-sm font-bold">{t('stats.digest')}</h2>
          {digest.data ? (
            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-text-secondary)]">
              {digest.data.text}
            </pre>
          ) : (
            <Spinner />
          )}
        </CardContent>
      </Card>
    </>
  )
}
