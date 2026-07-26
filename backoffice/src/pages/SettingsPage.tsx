import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppPage } from '@/shared/ui/layout/AppPage'
import { Button, Card, EmptyState, Input, Skeleton, Switch } from '@/shared/ui'
import { Archive } from '@/shared/ui/icons'
import { ApiError } from '@/api/client'
import { useRunRetention, useSettings, usePatchSettings, type SiteSettings } from '@/api/queries'

const DAYS = [
  ['mon', 'Пн'],
  ['tue', 'Вт'],
  ['wed', 'Ср'],
  ['thu', 'Чт'],
  ['fri', 'Пт'],
  ['sat', 'Сб'],
  ['sun', 'Вс'],
] as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  )
}

function Form({ initial }: { initial: SiteSettings }) {
  const patch = usePatchSettings()
  const retention = useRunRetention()
  const [name, setName] = useState(initial.name)
  const [digest, setDigest] = useState(initial.digest_time)
  const [tariff, setTariff] = useState(initial.tariff)
  const [infoDays, setInfoDays] = useState(String(initial.retention_info_days))
  const [alertDays, setAlertDays] = useState(String(initial.retention_alert_days))
  const [quota, setQuota] = useState(String(initial.media_quota_gb))
  const [whOn, setWhOn] = useState(initial.working_hours != null)
  const [days, setDays] = useState<string[]>(initial.working_hours?.days ?? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
  const [open, setOpen] = useState(initial.working_hours?.open ?? '08:00')
  const [close, setClose] = useState(initial.working_hours?.close ?? '18:00')

  const toggleDay = (d: string) =>
    setDays((x) => (x.includes(d) ? x.filter((v) => v !== d) : [...x, d]))

  const save = () => {
    patch
      .mutateAsync({
        name: name.trim(),
        digest_time: digest,
        tariff,
        retention_info_days: Number(infoDays),
        retention_alert_days: Number(alertDays),
        media_quota_gb: Number(quota),
        working_hours: whOn ? { days, open, close } : ({} as never),
      })
      .then(() => toast.success('Сохранено'))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Ошибка'))
  }

  const runRetention = () => {
    if (!window.confirm('Запустить чистку медиа? Просроченные кадры и сироты будут удалены безвозвратно.')) return
    retention
      .mutateAsync()
      .then((r) => toast.success(`Очищено: ${r.events} событий, ${r.orphans} сирот, освобождено ${r.freed_mb} МБ`))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Ошибка'))
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Название объекта">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Тариф">
            <select
              value={tariff}
              onChange={(e) => setTariff(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
            >
              <option value="basic">Ko'z (Basic)</option>
              <option value="pro">Nazorat (Pro)</option>
              <option value="enterprise">Qalqon (Enterprise)</option>
            </select>
          </Field>
        </div>

        <div className="border-t border-[var(--color-border-soft)] pt-5">
          <label className="flex items-center gap-2.5">
            <Switch checked={whOn} onCheckedChange={setWhOn} />
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Рабочие часы (появление вне окна = тревога)
            </span>
          </label>
          {whOn && (
            <div className="mt-4 flex flex-col gap-4 pl-1">
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(([k, lbl]) => {
                  const on = days.includes(k)
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleDay(k)}
                      className={
                        'h-9 w-11 rounded-[var(--radius-md)] border text-[13px] font-semibold ' +
                        (on
                          ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)]')
                      }
                    >
                      {lbl}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-4">
                <Field label="Открытие">
                  <Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} className="w-32" />
                </Field>
                <Field label="Закрытие">
                  <Input type="time" value={close} onChange={(e) => setClose(e.target.value)} className="w-32" />
                </Field>
              </div>
            </div>
          )}
        </div>

        <Field label="Время дайджеста">
          <Input type="time" value={digest} onChange={(e) => setDigest(e.target.value)} className="w-32" />
        </Field>

        <Button onClick={save} disabled={patch.isPending} className="self-start">
          Сохранить
        </Button>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div>
          <div className="text-[15px] font-bold text-[var(--color-text-primary)]">Хранение медиа</div>
          <div className="text-[12.5px] text-[var(--color-text-muted)]">
            Рутина тает быстро, улики живут долго. Удаляются только файлы — история событий сохраняется.
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="info (дней)">
            <Input type="number" min="1" value={infoDays} onChange={(e) => setInfoDays(e.target.value)} />
          </Field>
          <Field label="alert/warning (дней)">
            <Input type="number" min="1" value={alertDays} onChange={(e) => setAlertDays(e.target.value)} />
          </Field>
          <Field label="квота ГБ (0 = без)">
            <Input type="number" min="0" value={quota} onChange={(e) => setQuota(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={patch.isPending}>
            Сохранить сроки
          </Button>
          <Button variant="ghost" onClick={runRetention} disabled={retention.isPending}>
            <Archive size={16} /> Запустить чистку сейчас
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function SettingsPage() {
  const q = useSettings()
  const [key, setKey] = useState(0)
  useEffect(() => {
    if (q.data) setKey((k) => k + 1)
  }, [q.data])

  return (
    <AppPage title="Настройки" description="Объект, рабочие часы, тариф и хранение">
      {q.isLoading ? (
        <Skeleton className="h-96 max-w-2xl" />
      ) : q.isError || !q.data ? (
        <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
      ) : (
        <Form key={key} initial={q.data} />
      )}
    </AppPage>
  )
}
