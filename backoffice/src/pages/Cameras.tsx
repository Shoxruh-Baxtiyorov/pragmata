import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Video } from 'lucide-react'
import { api, ApiError, type CameraOut } from '../api'
import { useFetch } from '../hooks'
import { Badge, Button, Card, Field, Input } from '../ui'
import { PageState } from './state'

function Row({ cam, reload }: { cam: CameraOut; reload: () => void }) {
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      reload()
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  const toggle = () => run(() => api.patch(`/api/v1/cameras/${cam.id}`, { enabled: !cam.enabled }))
  const remove = () => {
    if (window.confirm(`Удалить камеру «${cam.name}»? События сохранятся.`))
      run(() => api.del(`/api/v1/cameras/${cam.id}`))
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border-default py-3 last:border-0">
      <span className={cam.enabled ? 'text-brand' : 'text-text-placeholder'}>
        <Video size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold" title={cam.name}>
          {cam.name}
        </p>
        <p className="truncate text-caption text-text-placeholder">
          {cam.id}
          {cam.zones.length > 0 && ` · зон: ${cam.zones.length}`}
        </p>
      </div>
      {!cam.enabled ? (
        <Badge tone="neutral">выключена</Badge>
      ) : cam.online ? (
        <Badge tone="success">онлайн</Badge>
      ) : (
        <Badge tone="warning">нет сигнала</Badge>
      )}
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={toggle} disabled={busy}>
          {cam.enabled ? 'выключить' : 'включить'}
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} disabled={busy} title="Удалить">
          <Trash2 size={17} />
        </Button>
      </div>
    </div>
  )
}

function AddCamera({ reload }: { reload: () => void }) {
  const [open, setOpen] = useState(false)
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/api/v1/cameras', { id: id.trim(), name: name.trim(), url: url.trim() })
      setId('')
      setName('')
      setUrl('')
      setOpen(false)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка создания')
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> Добавить камеру
      </Button>
    )

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Field label="ID">
        <Input
          className="w-28"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="cam1"
          required
        />
      </Field>
      <Field label="Название">
        <Input
          className="w-40"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Проходная"
          required
        />
      </Field>
      <Field label="RTSP-адрес">
        <Input
          className="w-80"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/101"
          required
        />
      </Field>
      <Button type="submit" size="sm" loading={busy}>
        Создать
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Отмена
      </Button>
      {error && <p className="w-full text-label text-error">{error}</p>}
    </form>
  )
}

export function Cameras() {
  const q = useFetch<CameraOut[]>(() => api.get('/api/v1/cameras?all=true'))

  return (
    <PageState loading={q.loading} error={q.error} reload={q.reload}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label text-text-secondary">
            Учётка камеры хранится зашифрованной. Правка перезагружает пайплайн автоматически.
          </p>
          <AddCamera reload={q.reload} />
        </div>
        <Card className="p-4">
          {q.data?.map((c) => (
            <Row key={c.id} cam={c} reload={q.reload} />
          ))}
        </Card>
      </div>
    </PageState>
  )
}
