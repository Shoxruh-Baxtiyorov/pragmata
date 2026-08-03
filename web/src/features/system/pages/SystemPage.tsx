import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Card, EmptyState, PageHeader, Skeleton, SkeletonList } from '@/shared/ui'
import { dateTime } from '@/shared/lib/format'
import { Cpu, Database, MonitorPlay, ShieldCheck, Video, VideoOff } from '@/shared/ui/icons'
import { useSystem } from '../api/systemApi'

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      {tone ? (
        <Badge tone={tone}>{value}</Badge>
      ) : (
        <span className="truncate font-semibold text-[var(--color-text-primary)]" title={value}>
          {value}
        </span>
      )}
    </div>
  )
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      {children}
    </h2>
  )
}

export function SystemPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useSystem()

  if (isLoading)
    return (
      <>
        <PageHeader title={t('system.title')} subtitle={t('system.subtitle')} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <SkeletonList rows={2} className="h-40" />
        </div>
      </>
    )
  if (isError || !data)
    return (
      <>
        <PageHeader title={t('system.title')} subtitle={t('system.subtitle')} />
        <EmptyState text={t('common.noConnection')} onRetry={refetch} />
      </>
    )

  return (
    <>
      <PageHeader title={t('system.title')} subtitle={t('system.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle icon={<MonitorPlay size={16} />}>{t('system.cameras')}</SectionTitle>
          {data.cameras.length === 0 ? (
            <EmptyState text={t('common.empty')} />
          ) : (
            <div className="divide-y divide-[var(--color-border-soft)]">
              {data.cameras.map((c) => (
                <div
                  key={c.id}
                  className="-mx-4 flex items-center gap-3 px-4 py-2.5 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-row-alt)]"
                >
                  {/* Цвет статуса несёт бейдж справа — иконка остаётся нейтральной */}
                  <span className="text-[var(--color-text-muted)]">
                    {c.online ? <Video size={16} /> : <VideoOff size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" title={c.name}>
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">
                      {c.last_event ? dateTime(c.last_event) : t('system.never')} · {c.events_24h}{' '}
                      {t('system.events24')}
                    </p>
                  </div>
                  <Badge tone={c.online ? 'success' : 'error'}>
                    {c.online ? t('live.online') : t('live.offline')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle icon={<Cpu size={16} />}>{t('system.ai')}</SectionTitle>
            <div className="divide-y divide-[var(--color-border-soft)]">
              <Row label={t('system.detector')} value={data.yolo_model} />
              <Row
                label={t('system.agent')}
                value={data.agent_enabled ? t('system.on') : t('system.off')}
                tone={data.agent_enabled ? 'success' : 'neutral'}
              />
              <Row
                label={t('system.vlm')}
                value={data.vlm_enabled ? t('system.on') : t('system.off')}
                tone={data.vlm_enabled ? 'success' : 'neutral'}
              />
              <Row
                label={t('system.offline')}
                value={data.offline_mode ? t('system.yes') : t('system.no')}
                tone={data.offline_mode ? 'success' : 'neutral'}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Database size={16} />}>{t('system.site')}</SectionTitle>
            <div className="divide-y divide-[var(--color-border-soft)]">
              <Row label={t('system.site')} value={data.site_name} />
              <Row label={t('system.timezone')} value={data.timezone} />
              <Row label={t('system.totalEvents')} value={String(data.events_total)} />
            </div>
          </Card>

          {data.offline_mode && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-status-success-border)] bg-[var(--color-success-bg)] px-4 py-3 text-sm font-medium text-[var(--color-success-text)]">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              {t('system.offlineBanner')}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
