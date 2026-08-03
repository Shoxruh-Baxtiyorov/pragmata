import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  FieldLabel,
  Input,
  PageHeader,
  SkeletonList,
} from '@/shared/ui'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { MapPin, Pencil, Plus, Trash2, Video, VideoOff, X } from '@/shared/ui/icons'
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_auto]">
        <label>
          <FieldLabel className="mb-1.5">{t('manage.cameraName')}</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <FieldLabel className="mb-1.5">{t('manage.newUrl')}</FieldLabel>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('manage.keepUrl')}
          />
        </label>
        <label>
          <FieldLabel className="mb-1.5">fps</FieldLabel>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={fps}
            onChange={(e) => setFps(e.target.value)}
            placeholder="—"
            className="w-24"
          />
        </label>
      </div>

      {patch.isError && <ErrorNote className="mt-3">{apiErrorMessage(patch.error, t)}</ErrorNote>}

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border-soft)] pt-3">
        <Button size="sm" onClick={save} loading={patch.isPending}>
          {t('manage.save')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t('common.close')}
        </Button>
      </div>
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
  const [confirmDelCam, setConfirmDelCam] = useState(false)
  const [zoneToDel, setZoneToDel] = useState<Camera['zones'][number] | null>(null)

  return (
    <div className="-mx-4 flex flex-col gap-2 border-b border-[var(--color-border-soft)] px-4 py-3 transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-[var(--color-row-alt)]">
      <div className="flex items-center gap-3">
        {/* Цвет статуса несёт бейдж — иконка остаётся нейтральной */}
        <span className="text-[var(--color-text-muted)]">
          {cam.online ? <Video size={16} /> : <VideoOff size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={cam.name}>
            {cam.name}
          </p>
          <p className="truncate font-mono text-xs text-[var(--color-text-secondary)]">{cam.id}</p>
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
          disabled={patch.isPending}
          onClick={() => patch.mutate({ id: cam.id, patch: { enabled: !cam.enabled } })}
        >
          {cam.enabled ? t('manage.disable') : t('manage.enable')}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('manage.delete')}
          title={t('manage.delete')}
          disabled={del.isPending}
          className="text-[var(--color-error-text)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error-text)]"
          onClick={() => setConfirmDelCam(true)}
        >
          <Trash2 size={16} />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelCam}
        title={t('manage.delete')}
        description={t('manage.confirmDelete', { name: cam.name })}
        confirmLabel={t('manage.delete')}
        busy={del.isPending}
        onConfirm={() => {
          del.mutate(cam.id)
          setConfirmDelCam(false)
        }}
        onCancel={() => setConfirmDelCam(false)}
      />

      {(patch.isError || del.isError || delZone.isError) && (
        <ErrorNote className="ml-7">
          {apiErrorMessage(patch.error ?? del.error ?? delZone.error, t)}
        </ErrorNote>
      )}

      {editCam && <EditCameraForm cam={cam} onDone={() => setEditCam(false)} />}

      <div className="flex flex-wrap items-center gap-2 pl-7">
        {cam.zones.map((z) => (
          <Chip
            key={z.id ?? z.name}
            // Зона рисуется вручную по кадру — случайный клик по крестику
            // стирал её без предупреждения (как и удаление камеры, спрашиваем)
            onDismiss={z.id ? () => setZoneToDel(z) : undefined}
          >
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={16} className="text-[var(--color-text-muted)]" />
              {z.name}
            </span>
          </Chip>
        ))}
        <Button variant="secondary" size="sm" onClick={() => setEditZone(true)}>
          <Plus size={16} /> {t('manage.addZone')}
        </Button>
      </div>

      <ConfirmDialog
        open={zoneToDel !== null}
        title={t('manage.delete')}
        description={zoneToDel ? t('manage.confirmDeleteZone', { name: zoneToDel.name }) : ''}
        confirmLabel={t('manage.delete')}
        busy={delZone.isPending}
        onConfirm={() => {
          if (zoneToDel?.id) delZone.mutate(zoneToDel.id)
          setZoneToDel(null)
        }}
        onCancel={() => setZoneToDel(null)}
      />

      {editZone && <ZoneEditor camera={cam} onClose={() => setEditZone(false)} />}
    </div>
  )
}

function AddCameraForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const create = useCreateCamera()
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
    create.mutate(payload, { onSuccess: onDone })
  }

  return (
    <Card className="mb-4 p-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            {t('manage.addCamera')}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDone}
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X size={16} />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <FieldLabel className="mb-1.5">id</FieldLabel>
            <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="cam7" required />
          </label>
          <label className="lg:col-span-3">
            <FieldLabel className="mb-1.5">{t('manage.cameraName')}</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('manage.cameraName')}
              required
            />
          </label>
          <label className="sm:col-span-2">
            <FieldLabel className="mb-1.5">URL</FieldLabel>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="rtsp://… | http://…:8080/video"
              required
            />
          </label>
          <label>
            <FieldLabel className="mb-1.5">fps</FieldLabel>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={fps}
              onChange={(e) => setFps(e.target.value)}
              placeholder="—"
            />
          </label>
          <label>
            <FieldLabel className="mb-1.5">conf</FieldLabel>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={conf}
              onChange={(e) => setConf(e.target.value)}
              placeholder="—"
            />
          </label>
        </div>

        {create.isError && <ErrorNote>{apiErrorMessage(create.error, t)}</ErrorNote>}

        <div className="flex items-center gap-2 border-t border-[var(--color-border-soft)] pt-4">
          <Button type="submit" size="sm" loading={create.isPending}>
            {t('manage.add')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {t('common.close')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function ManagePage() {
  const { t } = useTranslation()
  const cams = useManageCameras()
  const [adding, setAdding] = useState(false)

  // Камерами управляет любой сотрудник организации — это его объект, а не
  // работа владельца платформы. Ограничение по организации держит бэкенд
  // (own_camera_or_404): чужую камеру он не покажет и не даст тронуть.
  return (
    <>
      <PageHeader
        title={t('manage.title')}
        subtitle={t('manage.subtitle')}
        actions={
          !adding && (
            <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
              <Plus size={16} /> {t('manage.addCamera')}
            </Button>
          )
        }
      />

      {/* Форма раньше жила в шапке и ломала её вёрстку — теперь отдельная панель */}
      {adding && <AddCameraForm onDone={() => setAdding(false)} />}

      {cams.isLoading ? (
        <SkeletonList rows={4} />
      ) : cams.isError || !cams.data ? (
        <EmptyState text={t('common.noConnection')} onRetry={cams.refetch} />
      ) : cams.data.length === 0 ? (
        <EmptyState text={t('common.empty')} />
      ) : (
        <Card className="p-4">
          {/* Card кита — flex-колонка с gap-4; строки идут одним блоком,
              иначе к их отступам прибавляется gap и разделители «отлипают» */}
          <div>
            {cams.data.map((cam) => (
              <CameraRow key={cam.id} cam={cam} />
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
