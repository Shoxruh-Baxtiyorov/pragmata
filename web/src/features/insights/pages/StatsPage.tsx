import { useTranslation } from 'react-i18next'
import { Card, EmptyState, Spinner } from '@/shared/ui'
import { eventIcon } from '@/shared/lib/format'
import type { EventType } from '@/shared/api/types'
import { useDigest, useStats } from '../api/insightsApi'

function Bars({ data }: { data: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(data))
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-40 flex-shrink-0 truncate text-sm text-[var(--color-muted)]" title={k}>
            {eventIcon[k as EventType] ?? ''} {k}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-surface-2)]">
            <div
              className="h-full bg-[var(--color-accent)]"
              style={{ width: `${(v / max) * 100}%` }}
            />
          </div>
          <span className="w-10 flex-shrink-0 text-right font-mono text-sm">{v}</span>
        </div>
      ))}
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-sm text-[var(--color-muted)]">{t('stats.visitors')}</p>
          <p className="mt-1 font-mono text-3xl">{stats.data.visitors_entered}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--color-muted)]">{t('stats.alerts')}</p>
          <p className="mt-1 font-mono text-3xl text-[var(--color-alert)]">{stats.data.alerts}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium">{t('stats.byType')}</h2>
        <Bars data={stats.data.by_type} />
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium">{t('stats.byCamera')}</h2>
        <Bars data={stats.data.by_camera} />
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium">{t('stats.digest')}</h2>
        {digest.data ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-text)]">
            {digest.data.text}
          </pre>
        ) : (
          <Spinner />
        )}
      </Card>
    </div>
  )
}
