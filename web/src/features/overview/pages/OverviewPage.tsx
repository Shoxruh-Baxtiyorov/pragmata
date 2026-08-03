import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client'
import { POLL, eventLabel, type EventType } from '@/shared/lib/format'
import type { HourBucket, OverviewOut } from '@/shared/api/types'
import {
  PageHeader,
  StatTile,
  EmptyState,
  Skeleton,
  SkeletonGrid,
  Card,
  Badge,
  StaleBadge,
  Button,
} from '@/shared/ui'
// Напрямую из кита, а не через '@/shared/ui': барель тянет recharts во все чанки
import { HourlyActivityChart } from '@/shared/ds/charts'
import { ArrowRight, Camera, CameraOff, ShieldAlert, eventIcon } from '@/shared/ui/icons'

export function OverviewPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () => api.get<OverviewOut>('/api/v1/overview'),
    refetchInterval: POLL.stats,
  })

  // язык гарантированно из известного набора — иначе fallback uz
  const lang = (['ru', 'uz', 'en'].includes(i18n.language) ? i18n.language : 'uz') as 'ru' | 'uz' | 'en'
  const offline = data ? data.cameras_total - data.cameras_online : 0
  const noActivity = !!data && data.hourly.every((b) => b.events === 0 && b.alerts === 0)
  // Обзор перезапрашивается по таймеру — держим проп графика стабильным
  const tooltipFormat = useCallback(
    (b: HourBucket) =>
      t('overview.chart.tooltip', { hour: b.hour, events: b.events, alerts: b.alerts }),
    [t],
  )

  // Статус камер живёт в шапке — это первое, куда смотрит оператор, и отдельная
  // почти пустая карточка под него не нужна. При обрыве связи цифры на экране
  // уже устарели, поэтому вместо (неверного) статуса показываем предупреждение.
  const status =
    isError && data ? (
      <StaleBadge show />
    ) : data ? (
      <Badge tone={offline === 0 ? 'success' : 'error'}>
        {offline === 0 ? <Camera size={16} /> : <CameraOff size={16} />}
        {offline === 0 ? t('overview.status.allOk') : t('overview.status.offline', { count: offline })}
      </Badge>
    ) : undefined

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.overview')} subtitle={t('overview.today')} actions={status} />

      {isLoading ? (
        <>
          {/* сетки скелетонов повторяют боевые — иначе на загрузке плитки прыгают */}
          <SkeletonGrid count={4} item="h-24" cols="gap-4 sm:grid-cols-2 lg:grid-cols-4" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </>
      ) : !data ? (
        <EmptyState text={t('overview.error')} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={t('overview.tile.people')} value={data.visitors_today} />
            <StatTile label={t('overview.tile.alerts')} value={data.alerts_today} />
            <StatTile label={t('overview.tile.falseAlarms')} value={data.false_positives_today} />
            <StatTile label={t('overview.tile.cameras')} value={`${data.cameras_online}/${data.cameras_total}`} />
          </div>

          <Card>
            <h2 className="text-h4">{t('overview.chart.title')}</h2>
            {noActivity ? (
              // за сутки ноль событий: пустая сетка графика читалась как поломка,
              // высоту держим той же (h-44), чтобы карточка не прыгала
              <p className="flex h-44 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-soft)] px-4 text-center text-label text-[var(--color-text-secondary)]">
                {t('overview.chart.empty')}
              </p>
            ) : (
              <HourlyActivityChart
                data={data.hourly}
                ariaLabel={t('overview.chart.title')}
                labels={{
                  events: t('overview.chart.series.events'),
                  alerts: t('overview.chart.series.alerts'),
                }}
                tooltipFormat={tooltipFormat}
              />
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h4">{t('overview.recent.title')}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
                {t('overview.recent.viewAll')}
                <ArrowRight size={16} />
              </Button>
            </div>
            {data.recent_alerts.length === 0 ? (
              <EmptyState text={t('overview.recent.empty')} />
            ) : (
              // -mx-4 + px-4 на строках: разделители идут от края до края карточки
              <ul className="-mx-4 divide-y divide-[var(--color-border-soft)]">
                {data.recent_alerts.map((ev) => {
                  const Icon = eventIcon[ev.type as EventType] ?? ShieldAlert
                  const time = new Date(ev.t_start).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  return (
                    <li key={ev.id} className="flex items-center gap-3 px-4 py-3">
                      <Icon size={20} className="shrink-0 text-[var(--color-text-secondary)]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body">{eventLabel(ev.type, lang)}</div>
                        <div className="truncate text-caption text-[var(--color-text-secondary)]">
                          {ev.camera}
                          {ev.zone ? ` · ${ev.zone}` : ''}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-caption tabular-nums text-[var(--color-text-secondary)]">
                        {time}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
