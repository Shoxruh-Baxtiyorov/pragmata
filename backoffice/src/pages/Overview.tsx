import { Activity, Bot, Camera, Lock, ShieldCheck, UserRound, Users } from 'lucide-react'
import { api, type Overview as OverviewData } from '../api'
import { useFetch } from '../hooks'
import { Badge, Card, StatTile } from '../ui'
import { PageState } from './state'

export function Overview() {
  const q = useFetch<OverviewData>(() => api.get('/api/v1/backoffice/overview'))

  return (
    <PageState loading={q.loading} error={q.error} reload={q.reload}>
      {q.data && (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-3 text-h4 text-text-secondary">Доступ и пользователи</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatTile label="Всего" value={q.data.users_total} icon={<Users size={18} />} />
              <StatTile label="Активны" value={q.data.users_active} tone="brand" />
              <StatTile
                label="Админы"
                value={q.data.admins}
                icon={<ShieldCheck size={18} />}
              />
              <StatTile
                label="С 2FA"
                value={q.data.users_with_2fa}
                icon={<Lock size={18} />}
              />
              <StatTile
                label="Заблокированы"
                value={q.data.users_locked}
                tone={q.data.users_locked ? 'warning' : undefined}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-h4 text-text-secondary">Объект</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile
                label="Камеры"
                value={`${q.data.cameras_enabled} / ${q.data.cameras_total}`}
                hint="активны / всего"
                icon={<Camera size={18} />}
              />
              <StatTile
                label="Люди в реестре"
                value={q.data.persons_total}
                icon={<UserRound size={18} />}
              />
              <StatTile
                label="События за сутки"
                value={q.data.events_today}
                hint="только live"
                icon={<Activity size={18} />}
              />
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-label text-text-secondary">AI-ассистент</p>
                  <span className="text-text-placeholder">
                    <Bot size={18} />
                  </span>
                </div>
                <p className="mt-2 truncate text-body font-semibold" title={q.data.llm_model}>
                  {q.data.llm_model}
                </p>
                <div className="mt-1">
                  <Badge tone={q.data.llm_enabled ? 'success' : 'neutral'}>
                    {q.data.llm_enabled ? 'включён' : 'выключен'}
                  </Badge>
                </div>
              </Card>
            </div>
          </section>
        </div>
      )}
    </PageState>
  )
}
