import type { ReactNode } from 'react'
import { AppPage } from '@/shared/ui/layout/AppPage'
import { Card, EmptyState, Skeleton, StatusBadge } from '@/shared/ui'
import {
  Activity,
  Building2,
  Camera,
  KeyRound,
  Lock,
  ShieldCheck,
  User,
} from '@/shared/ui/icons'
import { useOverview } from '@/api/queries'

function Stat({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: ReactNode
  tone?: 'brand' | 'warning'
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-[var(--color-text-muted)]">{label}</span>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <div
        className={
          'mt-1 text-[26px] font-extrabold tabular-nums ' +
          (tone === 'warning'
            ? 'text-[var(--color-warning-600)]'
            : tone === 'brand'
              ? 'text-[var(--color-brand-500)]'
              : 'text-[var(--color-text-primary)]')
        }
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">{hint}</div>}
    </Card>
  )
}

export function OverviewPage() {
  const q = useOverview()

  return (
    <AppPage title="Обзор" description="Состояние платформы одним экраном">
      {q.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : q.isError || !q.data ? (
        <EmptyState
          variant="error"
          title="Не удалось загрузить"
          description="Проверьте доступ к бэкофису"
          action={{ label: 'Повторить', onClick: () => void q.refetch() }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-3 text-[15px] font-bold text-[var(--color-text-secondary)]">
              Доступ и пользователи
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="Всего" value={q.data.users_total} icon={<User size={18} />} />
              <Stat label="Активны" value={q.data.users_active} tone="brand" icon={<ShieldCheck size={18} />} />
              <Stat label="Админы" value={q.data.admins} icon={<KeyRound size={18} />} />
              <Stat label="С 2FA" value={q.data.users_with_2fa} icon={<Lock size={18} />} />
              <Stat
                label="Заблокированы"
                value={q.data.users_locked}
                tone={q.data.users_locked ? 'warning' : undefined}
                icon={<Lock size={18} />}
              />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-[15px] font-bold text-[var(--color-text-secondary)]">Объект</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Камеры"
                value={`${q.data.cameras_enabled} / ${q.data.cameras_total}`}
                hint="активны / всего"
                icon={<Camera size={18} />}
              />
              <Stat label="Люди в реестре" value={q.data.persons_total} icon={<Building2 size={18} />} />
              <Stat
                label="События за сутки"
                value={q.data.events_today}
                hint="только live"
                icon={<Activity size={18} />}
              />
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-[var(--color-text-muted)]">
                    AI-ассистент
                  </span>
                  <span className="text-[var(--color-text-muted)]">
                    <Activity size={18} />
                  </span>
                </div>
                <div className="mt-2 truncate text-[15px] font-bold text-[var(--color-text-primary)]" title={q.data.llm_model}>
                  {q.data.llm_model}
                </div>
                <div className="mt-1">
                  <StatusBadge tone={q.data.llm_enabled ? 'success' : 'neutral'}>
                    {q.data.llm_enabled ? 'включён' : 'выключен'}
                  </StatusBadge>
                </div>
              </Card>
            </div>
          </section>
        </div>
      )}
    </AppPage>
  )
}
