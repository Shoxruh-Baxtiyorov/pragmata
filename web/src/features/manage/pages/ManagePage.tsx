import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Spinner } from '@/shared/ui'
import { MapPin, Plus, Trash2, Video, VideoOff } from '@/shared/ui/icons'
import type { Camera, CameraInput } from '@/shared/api/types'
import {
  useCreateCamera,
  useDeleteCamera,
  useDeleteZone,
  useManageCameras,
  usePatchCamera,
} from '../api/manageApi'
import { ZoneEditor } from '../components/ZoneEditor'

function CameraRow({ cam }: { cam: Camera }) {
  const { t } = useTranslation()
  const patch = usePatchCamera()
  const del = useDeleteCamera()
  const delZone = useDeleteZone()
  const [editZone, setEditZone] = useState(false)

  return (
    <div className="flex flex-col gap-2 border-b border-border-default py-3 last:border-0">
      <div className="flex items-center gap-3">
        <span className={cam.online ? 'text-success' : 'text-text-placeholder'}>
          {cam.online ? <Video size={18} /> : <VideoOff size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold" title={cam.name}>
            {cam.name}
          </p>
          <p className="font-mono text-caption text-text-secondary">{cam.id}</p>
        </div>
        {cam.enabled ? (
          <Badge tone={cam.online ? 'success' : 'warning'}>
            {cam.online ? t('live.online') : t('live.offline')}
          </Badge>
        ) : (
          <Badge tone="neutral">{t('manage.disabled')}</Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => patch.mutate({ id: cam.id, patch: { enabled: !cam.enabled } })}
        >
          {cam.enabled ? t('manage.disable') : t('manage.enable')}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('manage.delete')}
          onClick={() => del.mutate(cam.id)}
        >
          <Trash2 size={16} className="text-error" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        {cam.zones.map((z) => (
          <span
            key={z.id ?? z.name}
            className="inline-flex items-center gap-1 rounded-pill border border-border-default px-2 py-0.5 text-caption"
          >
            <MapPin size={11} className="text-brand" />
            {z.name}
            {z.id && (
              <button
                className="ml-0.5 text-text-secondary hover:text-error"
                onClick={() => delZone.mutate(z.id as string)}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setEditZone(true)}>
          <Plus size={12} /> {t('manage.addZone')}
        </Button>
      </div>

      {editZone && <ZoneEditor camera={cam} onClose={() => setEditZone(false)} />}
    </div>
  )
}

function AddCameraForm() {
  const { t } = useTranslation()
  const create = useCreateCamera()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [fps, setFps] = useState('')
  const [conf, setConf] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const payload: CameraInput = { id: id.trim(), name: name.trim(), url: url.trim(), clips_enabled: true }
    if (fps) payload.process_fps = Number(fps)
    if (conf) payload.detect_conf = Number(conf)
    create.mutate(payload, {
      onSuccess: () => {
        setId('')
        setName('')
        setUrl('')
        setFps('')
        setConf('')
        setOpen(false)
      },
    })
  }

  if (!open)
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> {t('manage.addCamera')}
      </Button>
    )

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="id (cam7)" className="h-9 w-28" required />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('manage.cameraName')}
        className="h-9 w-40"
        required
      />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="rtsp://… | http://…:8080/video"
        className="h-9 min-w-56 flex-1"
        required
      />
      <Input
        type="number"
        step="0.1"
        min="0"
        value={fps}
        onChange={(e) => setFps(e.target.value)}
        placeholder="fps"
        className="h-9 w-20"
      />
      <Input
        type="number"
        step="0.05"
        min="0"
        max="1"
        value={conf}
        onChange={(e) => setConf(e.target.value)}
        placeholder="conf"
        className="h-9 w-20"
      />
      <Button type="submit" size="sm" disabled={create.isPending}>
        {t('manage.add')}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t('common.close')}
      </Button>
    </form>
  )
}

export function ManagePage() {
  const { t } = useTranslation()
  const cams = useManageCameras()

  return (
    <>
      <PageHeader title={t('manage.title')} subtitle={t('manage.subtitle')} actions={<AddCameraForm />} />

      {cams.isLoading ? (
        <Spinner />
      ) : cams.isError || !cams.data ? (
        <EmptyState text={t('common.noConnection')} onRetry={cams.refetch} />
      ) : (
        <Card>
          {cams.data.map((cam) => (
            <CameraRow key={cam.id} cam={cam} />
          ))}
        </Card>
      )}
    </>
  )
}
