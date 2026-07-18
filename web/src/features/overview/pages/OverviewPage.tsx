import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client'
import { POLL, eventLabel, type EventType } from '@/shared/lib/format'
import type { OverviewOut } from '@/shared/api/types'
import { PageHeader, StatTile, EmptyState, Spinner, Card, Badge, Button } from '@/shared/ui'
import { Camera, CameraOff, ShieldAlert, eventIcon } from '@/shared/ui/icons'
import { HourlyBars } from '@/features/overview/ui/HourlyBars'

export function OverviewPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.get<OverviewOut>('/api/v1/overview'),
    refetchInterval: POLL.stats,
  })

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  if (isError || !data) return <EmptyState text={t('overview.error')} onRetry={refetch} />

  // язык гарантированно из известного набора — иначе fallback uz
  const lang = (['ru', 'uz', 'en'].includes(i18n.language) ? i18n.language : 'uz') as 'ru' | 'uz' | 'en'
  const allOk = data.cameras_online === data.cameras_total
  const noActivity = data.hourly.every((b) => b.events === 0 && b.alerts === 0)

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.overview')} actions={<Badge tone="neutral">{t('overview.today')}</Badge>} />

      <Card>
        <div className="flex items-center gap-3">
          {allOk ? (
            <Camera size={20} className="text-success" />
          ) : (
            <CameraOff size={20} className="text-error" />
          )}
          <Badge tone={allOk ? 'success' : 'error'}>
            {allOk
              ? t('overview.status.allOk')
              : t('overview.status.offline', { count: data.cameras_total - data.cameras_online })}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t('overview.tile.people')} value={data.visitors_today} />
        <StatTile label={t('overview.tile.alerts')} value={data.alerts_today} />
        <StatTile label={t('overview.tile.falseAlarms')} value={data.false_positives_today} />
        <StatTile label={t('overview.tile.cameras')} value={`${data.cameras_online}/${data.cameras_total}`} />
      </div>

      <Card>
        <h2 className="text-h4">{t('overview.chart.title')}</h2>
        <div className="mt-4">
          <HourlyBars
            data={data.hourly}
            ariaLabel={t('overview.chart.title')}
            titleFormat={(b) => t('overview.chart.tooltip', { hour: b.hour, events: b.events, alerts: b.alerts })}
          />
        </div>
        {noActivity && (
          <p className="mt-2 text-caption text-text-secondary">{t('overview.chart.empty')}</p>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h4">{t('overview.recent.title')}</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
            {t('overview.recent.viewAll')}
          </Button>
        </div>
        {data.recent_alerts.length === 0 ? (
          <EmptyState text={t('overview.recent.empty')} />
        ) : (
          <ul className="divide-y divide-border-default">
            {data.recent_alerts.map((ev) => {
              const Icon = eventIcon[ev.type as EventType] ?? ShieldAlert
              const time = new Date(ev.t_start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <li key={ev.id} className="flex items-center gap-3 py-3">
                  <Icon size={20} className="shrink-0 text-text-secondary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body">{eventLabel(ev.type, lang)}</div>
                    <div className="text-caption text-text-secondary">
                      {ev.camera}
                      {ev.zone ? ` · ${ev.zone}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-caption text-text-secondary">{time}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
