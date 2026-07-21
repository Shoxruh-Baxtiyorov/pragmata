import { useEffect, useState } from 'react'
import { Clapperboard, Search } from 'lucide-react'
import { api, ApiError, type ArchiveJob, type CameraOut } from '../api'
import { useFetch } from '../hooks'
import { Badge, Button, Card, Field, Input, Select } from '../ui'
import { PageState } from './state'

const STATUS: Record<string, { label: string; tone: 'neutral' | 'brand' | 'success' | 'error' }> = {
  pending: { label: 'в очереди', tone: 'neutral' },
  running: { label: 'разбирается', tone: 'brand' },
  done: { label: 'готово', tone: 'success' },
  error: { label: 'ошибка', tone: 'error' },
}

function JobRow({ j }: { j: ArchiveJob }) {
  const st = STATUS[j.status] ?? STATUS.pending
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border-default py-3 last:border-0">
      <span className="text-text-secondary">
        <Clapperboard size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold" title={j.filename}>
          {j.filename}
        </p>
        <p className="text-caption text-text-placeholder">
          {j.camera_id} · запись от {new Date(j.recorded_at).toLocaleString()}
        </p>
        {j.status === 'running' && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-pill bg-bg-secondary">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-brand-hi to-brand transition-all"
              style={{ width: `${Math.round(j.progress * 100)}%` }}
            />
          </div>
        )}
        {j.error && <p className="mt-1 text-caption text-error">{j.error}</p>}
      </div>
      <span className="text-label font-semibold tabular-nums">
        {j.events_found} <span className="text-text-placeholder">соб.</span>
      </span>
      <Badge tone={st.tone}>{st.label}</Badge>
    </div>
  )
}

function NvrForm({ cameras, onStarted }: { cameras: CameraOut[]; onStarted: () => void }) {
  const [camera, setCamera] = useState(cameras[0]?.id ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [brand, setBrand] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post('/api/v1/archive/nvr', {
        camera_id: camera,
        from_time: from,
        to_time: to,
        brand: brand || null,
      })
      onStarted()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось запустить разбор')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <p className="mb-1 text-h4">Разобрать архив с регистратора</p>
      <p className="mb-4 text-label text-text-secondary">
        Ссылку искать не нужно — playback собирается из адреса камеры. Укажите камеру и когда
        предположительно случилось происшествие.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Камера">
          <Select value={camera} onChange={setCamera} className="w-52">
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="С">
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-52"
          />
        </Field>
        <Field label="По">
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-52"
          />
        </Field>
        <Field label="Бренд">
          <Select value={brand} onChange={setBrand} className="w-40">
            <option value="">определить сам</option>
            <option value="hikvision">Hikvision</option>
            <option value="dahua">Dahua</option>
          </Select>
        </Field>
        <Button onClick={submit} loading={busy} disabled={!camera || !from || !to}>
          <Search size={16} /> Разобрать
        </Button>
      </div>
      {error && <p className="mt-3 text-label text-error">{error}</p>}
    </Card>
  )
}

export function Archive() {
  const cams = useFetch<CameraOut[]>(() => api.get('/api/v1/cameras?all=true'))
  const jobs = useFetch<ArchiveJob[]>(() => api.get('/api/v1/archive/jobs'))

  // пока что-то разбирается — подтягиваем прогресс
  const active = jobs.data?.some((j) => j.status === 'running' || j.status === 'pending')
  useEffect(() => {
    if (!active) return
    const t = setInterval(jobs.reload, 3000)
    return () => clearInterval(t)
  }, [active, jobs.reload])

  return (
    <PageState loading={cams.loading} error={cams.error} reload={cams.reload}>
      <div className="flex flex-col gap-5">
        {cams.data && <NvrForm cameras={cams.data} onStarted={jobs.reload} />}
        <div>
          <p className="mb-2 text-h4">Задачи разбора</p>
          {jobs.data && jobs.data.length === 0 ? (
            <Card className="p-8 text-center text-label text-text-secondary">
              Пока ничего не разбирали
            </Card>
          ) : (
            <Card className="p-4">
              {jobs.data?.map((j) => (
                <JobRow key={j.id} j={j} />
              ))}
            </Card>
          )}
        </div>
      </div>
    </PageState>
  )
}
