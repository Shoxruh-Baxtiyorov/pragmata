import { useTranslation } from 'react-i18next'
import { Card, EmptyState, PageHeader, Spinner, StatusBadge } from '@/shared/ui'
import { dateTime } from '@/shared/lib/format'
import { Cpu, Database, MonitorPlay, ShieldCheck, Video, VideoOff } from '@/shared/ui/icons'
import { useSystem } from '../api/systemApi'

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      {tone ? <StatusBadge tone={tone}>{value}</StatusBadge> : <span className="font-medium">{value}</span>}
    </div>
  )
}

export function SystemPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useSystem()

  if (isLoading) return <Spinner />
  if (isError || !data) return <EmptyState title={t('common.noConnection')} />

  return (
    <>
      <PageHeader title={t('system.title')} subtitle={t('system.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <MonitorPlay size={16} className="text-[var(--color-brand-500)]" /> {t('system.cameras')}
          </h2>
          <div className="divide-y divide-[var(--color-border-soft)]">
            {data.cameras.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <span style={{ color: c.online ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {c.online ? <Video size={17} /> : <VideoOff size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={c.name}>
                    {c.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-subtle)]">
                    {c.last_event ? dateTime(c.last_event) : t('system.never')} · {c.events_24h}{' '}
                    {t('system.events24')}
                  </p>
                </div>
                <StatusBadge tone={c.online ? 'success' : 'error'}>
                  {c.online ? t('live.online') : t('live.offline')}
                </StatusBadge>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Cpu size={16} className="text-[var(--color-violet)]" /> {t('system.ai')}
            </h2>
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

          <Card className="p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Database size={16} className="text-[var(--color-info)]" /> {t('system.site')}
            </h2>
            <div className="divide-y divide-[var(--color-border-soft)]">
              <Row label={t('system.site')} value={data.site_name} />
              <Row label="Timezone" value={data.timezone} />
              <Row label={t('system.totalEvents')} value={String(data.events_total)} />
            </div>
          </Card>

          {data.offline_mode && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--color-success-bg)] px-4 py-3 text-sm text-[var(--color-success)]">
              <ShieldCheck size={18} />
              Весь AI работает локально — видео и лица не покидают объект.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
