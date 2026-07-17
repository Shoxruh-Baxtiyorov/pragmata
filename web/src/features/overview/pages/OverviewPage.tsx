import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, EmptyState, PageHeader, Skeleton, StatTile, StatusBadge } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { eventLabel, timeHMS } from '@/shared/lib/format'
import { eventIcon, ShieldAlert, Users, Video, WifiOff } from '@/shared/ui/icons'
import type { EventItem, HourBucket } from '@/shared/api/types'
import { useOverview } from '../api/overviewApi'

function ActivityChart({ data }: { data: HourBucket[] }) {
  const max = Math.max(1, ...data.map((d) => d.events))
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((b, i) => (
        <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-col justify-end" style={{ height: 96 }}>
            {b.alerts > 0 && (
              <div
                className="w-full rounded-t bg-[var(--color-danger)]"
                style={{ height: `${(b.alerts / max) * 96}px` }}
              />
            )}
            <div
              className="w-full rounded-t bg-[var(--color-brand-300)]"
              style={{ height: `${((b.events - b.alerts) / max) * 96}px` }}
            />
          </div>
          {i % 4 === 0 && (
            <span className="text-[9px] text-[var(--color-text-subtle)]">{b.hour.slice(0, 2)}</span>
          )}
          <div className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded bg-[var(--color-ink)] px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {b.hour}: {b.events} · {b.alerts}⚠
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertRow({ event, onClick }: { event: EventItem; onClick: () => void }) {
  const { i18n } = useTranslation()
  const thumb = useAuthedMedia(event.photo_url)
  const Icon = eventIcon[event.type]
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-[var(--color-muted-bg)]"
    >
      <div className="h-11 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-black">
        {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Icon size={14} className="text-[var(--color-danger)]" />
          {eventLabel(event.type, i18n.language)}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">{event.camera}</p>
      </div>
      <span className="font-mono text-xs text-[var(--color-text-subtle)]">{timeHMS(event.t_start)}</span>
    </button>
  )
}

export function OverviewPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { data, isLoading, isError } = useOverview()

  if (isLoading)
    return (
      <>
        <PageHeader title={t('overview.title')} subtitle={t('overview.subtitle')} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </>
    )
  if (isError || !data) return <EmptyState title={t('common.noConnection')} />

  return (
    <>
      <PageHeader title={t('overview.title')} subtitle={t('overview.subtitle')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={Users} tone="brand" label={t('overview.visitors')} value={data.visitors_today} />
        <StatTile icon={ShieldAlert} tone="error" label={t('overview.alerts')} value={data.alerts_today} />
        <StatTile
          icon={data.cameras_online === data.cameras_total ? Video : WifiOff}
          tone={data.cameras_online === data.cameras_total ? 'success' : 'warning'}
          label={t('overview.cameras')}
          value={`${data.cameras_online}/${data.cameras_total}`}
        />
        <StatTile icon={ShieldAlert} tone="neutral" label={t('overview.fp')} value={data.false_positives_today} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent>
            <h2 className="mb-4 text-sm font-bold">{t('overview.activity')}</h2>
            <ActivityChart data={data.hourly} />
            <div className="mt-3 flex gap-4 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-brand-300)]" /> {t('nav.events')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-danger-500)]" /> {t('overview.alerts')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">{t('overview.recentAlerts')}</h2>
              <StatusBadge tone="error">{data.recent_alerts.length}</StatusBadge>
            </div>
            {data.recent_alerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">{t('overview.noAlerts')}</p>
            ) : (
              <div className="-mx-2 flex flex-col">
                {data.recent_alerts.map((a) => (
                  <AlertRow key={a.id} event={a} onClick={() => nav(`/events?camera_id=${a.camera_id}`)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
