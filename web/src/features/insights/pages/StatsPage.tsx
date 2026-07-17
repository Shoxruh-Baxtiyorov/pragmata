import { useTranslation } from 'react-i18next'
import { Card, EmptyState, Spinner } from '@/shared/ui'
import { eventLabel } from '@/shared/lib/format'
import { eventIcon, ShieldAlert, Users } from '@/shared/ui/icons'
import type { EventType } from '@/shared/api/types'
import { useDigest, useStats } from '../api/insightsApi'

function Bars({ data, labelType }: { data: Record<string, number>; labelType?: boolean }) {
  const { i18n } = useTranslation()
  const max = Math.max(1, ...Object.values(data))
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-2">
      {rows.map(([k, v]) => {
        const Icon = labelType ? eventIcon[k as EventType] : null
        return (
          <div key={k} className="flex items-center gap-2">
            <span
              className="flex w-44 flex-shrink-0 items-center gap-1.5 truncate text-sm text-[var(--color-muted)]"
              title={k}
            >
              {Icon && <Icon size={14} className="flex-shrink-0" />}
              <span className="truncate">{labelType ? eventLabel(k, i18n.language) : k}</span>
            </span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded bg-[var(--color-accent)]"
                style={{ width: `${(v / max) * 100}%` }}
              />
            </div>
            <span className="w-10 flex-shrink-0 text-right font-mono text-sm">{v}</span>
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-accent)]">
            <Users size={22} />
          </span>
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('stats.visitors')}</p>
            <p className="font-mono text-3xl">{stats.data.visitors_entered}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-alert)]">
            <ShieldAlert size={22} />
          </span>
          <div>
            <p className="text-sm text-[var(--color-muted)]">{t('stats.alerts')}</p>
            <p className="font-mono text-3xl text-[var(--color-alert)]">{stats.data.alerts}</p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium">{t('stats.byType')}</h2>
        <Bars data={stats.data.by_type} labelType />
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
