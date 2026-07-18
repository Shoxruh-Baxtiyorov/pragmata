import { useTranslation } from 'react-i18next'
import { Badge, Card, EmptyState, PageHeader, Spinner } from '@/shared/ui'
import { dateTime } from '@/shared/lib/format'
import { Cpu, Database, MonitorPlay, ShieldCheck, Video, VideoOff } from '@/shared/ui/icons'
import { useSystem } from '../api/systemApi'

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'neutral' }) {
  return (
    <div className="flex items-center justify-between py-2 text-body">
      <span className="text-text-secondary">{label}</span>
      {tone ? <Badge tone={tone}>{value}</Badge> : <span className="font-medium">{value}</span>}
    </div>
  )
}

export function SystemPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useSystem()

  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  if (isError || !data) return <EmptyState text={t('common.noConnection')} />

  return (
    <>
      <PageHeader title={t('system.title')} subtitle={t('system.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 text-h4">
            <MonitorPlay size={16} className="text-brand" /> {t('system.cameras')}
          </h2>
          <div className="divide-y divide-border-default">
            {data.cameras.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <span className={c.online ? 'text-success' : 'text-error'}>
                  {c.online ? <Video size={17} /> : <VideoOff size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium" title={c.name}>
                    {c.name}
                  </p>
                  <p className="text-caption text-text-secondary">
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
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-1 flex items-center gap-2 text-h4">
              <Cpu size={16} className="text-brand" /> {t('system.ai')}
            </h2>
            <div className="divide-y divide-border-default">
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
            <h2 className="mb-1 flex items-center gap-2 text-h4">
              <Database size={16} className="text-brand" /> {t('system.site')}
            </h2>
            <div className="divide-y divide-border-default">
              <Row label={t('system.site')} value={data.site_name} />
              <Row label={t('system.timezone')} value={data.timezone} />
              <Row label={t('system.totalEvents')} value={String(data.events_total)} />
            </div>
          </Card>

          {data.offline_mode && (
            <div className="flex items-center gap-2 rounded-card bg-success/10 px-4 py-3 text-body text-success">
              <ShieldCheck size={18} />
              {t('system.offlineBanner')}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
