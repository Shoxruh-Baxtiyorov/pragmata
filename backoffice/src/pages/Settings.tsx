import { useEffect, useState } from 'react'
import { Check, Save } from 'lucide-react'
import { api, ApiError, type SiteSettings } from '../api'
import { useFetch } from '../hooks'
import { Button, Card, Field, Input, Select } from '../ui'
import { PageState } from './state'

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Пн' },
  { key: 'tue', label: 'Вт' },
  { key: 'wed', label: 'Ср' },
  { key: 'thu', label: 'Чт' },
  { key: 'fri', label: 'Пт' },
  { key: 'sat', label: 'Сб' },
  { key: 'sun', label: 'Вс' },
]
const TZS = ['Asia/Tashkent', 'Asia/Samarkand', 'Asia/Almaty', 'Europe/Moscow', 'UTC']

function SettingsForm({ initial, onSaved }: { initial: SiteSettings; onSaved: () => void }) {
  const [name, setName] = useState(initial.name)
  const [tz, setTz] = useState(initial.timezone)
  const [digest, setDigest] = useState(initial.digest_time)
  const [whOn, setWhOn] = useState(initial.working_hours != null)
  const [days, setDays] = useState<string[]>(
    initial.working_hours?.days ?? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  )
  const [open, setOpen] = useState(initial.working_hours?.open ?? '08:00')
  const [close, setClose] = useState(initial.working_hours?.close ?? '18:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const toggleDay = (k: string) =>
    setDays((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]))

  const save = async () => {
    setBusy(true)
    setError('')
    setOk(false)
    try {
      await api.patch('/api/v1/backoffice/settings', {
        name: name.trim(),
        timezone: tz,
        digest_time: digest,
        working_hours: whOn ? { days, open, close } : {},
      })
      setOk(true)
      onSaved()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-2xl p-6">
      <div className="flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Название объекта">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Часовой пояс">
            <Select value={tz} onChange={setTz}>
              {TZS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="border-t border-border-default pt-5">
          <label className="flex items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand)]"
              checked={whOn}
              onChange={(e) => setWhOn(e.target.checked)}
            />
            <span className="text-body font-medium">
              Рабочие часы (появление вне окна = тревога after-hours)
            </span>
          </label>

          {whOn && (
            <div className="mt-4 flex flex-col gap-4 pl-7">
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const on = days.includes(d.key)
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className={
                        'h-9 w-11 rounded-button border text-label font-medium transition-colors ' +
                        (on
                          ? 'border-brand bg-brand text-on-brand'
                          : 'border-border-default text-text-secondary hover:bg-bg-secondary')
                      }
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-end gap-4">
                <Field label="Открытие">
                  <Input
                    type="time"
                    value={open}
                    onChange={(e) => setOpen(e.target.value)}
                    className="w-32"
                  />
                </Field>
                <Field label="Закрытие">
                  <Input
                    type="time"
                    value={close}
                    onChange={(e) => setClose(e.target.value)}
                    className="w-32"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        <Field label="Время ежедневного дайджеста">
          <Input
            type="time"
            value={digest}
            onChange={(e) => setDigest(e.target.value)}
            className="w-32"
          />
        </Field>

        {error && <p className="text-label text-error">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} loading={busy}>
            <Save size={16} /> Сохранить
          </Button>
          {ok && (
            <span className="inline-flex items-center gap-1 text-label text-success">
              <Check size={16} /> Сохранено
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

export function Settings() {
  const q = useFetch<SiteSettings>(() => api.get('/api/v1/backoffice/settings'))
  // form-key заставляет пересобрать форму после reload с новыми данными
  const [key, setKey] = useState(0)
  useEffect(() => {
    if (q.data) setKey((k) => k + 1)
  }, [q.data])

  return (
    <PageState loading={q.loading} error={q.error} reload={q.reload}>
      {q.data && <SettingsForm key={key} initial={q.data} onSaved={q.reload} />}
    </PageState>
  )
}
