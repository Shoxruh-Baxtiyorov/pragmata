import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, Input, PageHeader, SkeletonList } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { MapPin, Pencil, Plus, Trash2, Video, VideoOff } from '@/shared/ui/icons'
import type { Camera, CameraInput } from '@/shared/api/types'
import {
  useCreateCamera,
  useDeleteCamera,
  useDeleteZone,
  useManageCameras,
  usePatchCamera,
} from '../api/manageApi'
import { ZoneEditor } from '../components/ZoneEditor'

function EditCameraForm({ cam, onDone }: { cam: Camera; onDone: () => void }) {
  const { t } = useTranslation()
  const patch = usePatchCamera()
  const [name, setName] = useState(cam.name)
  const [url, setUrl] = useState('')
  const [fps, setFps] = useState('')

  const save = () => {
    const body: Record<string, unknown> = {}
    if (name.trim() && name.trim() !== cam.name) body.name = name.trim()
    if (url.trim()) body.url = url.trim() // пусто = не менять (URL наружу не отдаётся)
    if (fps) body.process_fps = Number(fps)
    if (Object.keys(body).length === 0) return onDone()
    patch.mutate({ id: cam.id, patch: body }, { onSuccess: onDone })
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-card bg-bg-secondary p-3">
      <label className="flex flex-col gap-1">
        <span className="text-caption text-text-secondary">{t('manage.cameraName')}</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-44" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-caption text-text-secondary">{t('manage.newUrl')}</span>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('manage.keepUrl')}
          className="h-9 min-w-64 flex-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-caption text-text-secondary">fps</span>
        <Input
          type="number"
          step="0.5"
          min="0"
          value={fps}
          onChange={(e) => setFps(e.target.value)}
          placeholder="—"
          className="h-9 w-20"
        />
      </label>
      <Button size="sm" onClick={save} loading={patch.isPending}>
        {t('manage.save')}
      </Button>
      <Button variant="ghost" size="sm" onClick={onDone}>
        {t('common.close')}
      </Button>
      {patch.isError && (
        <p className="w-full text-caption text-error">
          {patch.error instanceof ApiError ? patch.error.message : t('common.noConnection')}
        </p>
      )}
    </div>
  )
}

function CameraRow({ cam }: { cam: Camera }) {
  const { t } = useTranslation()
  const patch = usePatchCamera()
  const del = useDeleteCamera()
  const delZone = useDeleteZone()
  const [editZone, setEditZone] = useState(false)
  const [editCam, setEditCam] = useState(false)

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
          size="icon"
          aria-label={t('manage.edit')}
          title={t('manage.edit')}
          onClick={() => setEditCam((v) => !v)}
        >
          <Pencil size={16} />
        </Button>
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
          disabled={del.isPending}
          onClick={() => {
            if (window.confirm(t('manage.confirmDelete', { name: cam.name })))
              del.mutate(cam.id)
          }}
        >
          <Trash2 size={16} className="text-error" />
        </Button>
      </div>

      {(patch.isError || del.isError) && (
        <p className="pl-7 text-caption text-error">
          {(patch.error ?? del.error) instanceof ApiError
            ? (patch.error ?? del.error)?.message
            : t('common.noConnection')}
        </p>
      )}

      {editCam && <EditCameraForm cam={cam} onDone={() => setEditCam(false)} />}

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
      {create.isError && (
        <p className="w-full text-caption text-error">
          {create.error instanceof ApiError ? create.error.message : t('common.noConnection')}
        </p>
      )}
    </form>
  )
}

export function ManagePage() {
  const { t } = useTranslation()
  const cams = useManageCameras()

  // Камерами управляет любой сотрудник организации — это его объект, а не
  // работа владельца платформы. Ограничение по организации держит бэкенд
  // (own_camera_or_404): чужую камеру он не покажет и не даст тронуть.
  return (
    <>
      <PageHeader
        title={t('manage.title')}
        subtitle={t('manage.subtitle')}
        actions={<AddCameraForm />}
      />

      {cams.isLoading ? (
        <SkeletonList rows={4} />
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
