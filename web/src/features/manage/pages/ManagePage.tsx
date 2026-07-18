import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, CardContent, EmptyState, PageHeader, Spinner, StatusBadge } from '@/shared/ui'
import { useToast } from '@/shared/ui/toast'
import { Cpu, MapPin, Plus, ShieldCheck, Trash2, Video, VideoOff } from '@/shared/ui/icons'
import type { Camera } from '@/shared/api/types'
import {
  useCreateCamera,
  useDeleteCamera,
  useDeleteZone,
  useManageCameras,
  usePatchCamera,
  useSystem,
} from '../api/manageApi'
import { ZoneEditor } from '../components/ZoneEditor'

function CameraRow({ cam }: { cam: Camera }) {
  const { t } = useTranslation()
  const patch = usePatchCamera()
  const del = useDeleteCamera()
  const delZone = useDeleteZone()
  const toast = useToast()
  const [editZone, setEditZone] = useState(false)

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-border-soft)] py-3 last:border-0">
      <div className="flex items-center gap-3">
        <span style={{ color: cam.online ? 'var(--color-success-500)' : 'var(--color-text-subtle)' }}>
          {cam.online ? <Video size={18} /> : <VideoOff size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold" title={cam.name}>{cam.name}</p>
          <p className="font-mono text-xs text-[var(--color-text-subtle)]">{cam.id}</p>
        </div>
        {cam.enabled ? (
          <StatusBadge tone={cam.online ? 'success' : 'warning'}>{cam.online ? t('live.online') : t('live.offline')}</StatusBadge>
        ) : (
          <Badge variant="secondary">{t('manage.disabled')}</Badge>
        )}
        <Button variant="ghost" size="sm" onClick={() => patch.mutate({ id: cam.id, patch: { enabled: !cam.enabled } })}>
          {cam.enabled ? t('manage.disable') : t('manage.enable')}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('manage.delete')}
          onClick={() => {
            del.mutate(cam.id)
            toast(t('manage.deleted'), 'ok')
          }}
        >
          <Trash2 size={16} className="text-[var(--color-danger-500)]" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        {cam.zones.map((z) => (
          <span key={z.id ?? z.name} className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] px-2 py-0.5 text-xs">
            <MapPin size={11} className="text-[var(--color-brand-500)]" />
            {z.name}
            {z.id && (
              <button className="ml-0.5 text-[var(--color-text-subtle)] hover:text-[var(--color-danger-500)]" onClick={() => delZone.mutate(z.id as string)}>
                ×
              </button>
            )}
          </span>
        ))}
        <Button variant="outline" size="xs" onClick={() => setEditZone(true)}>
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
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      { id: id.trim(), name: name.trim(), url: url.trim(), clips_enabled: true },
      {
        onSuccess: () => {
          toast(t('manage.cameraAdded'), 'ok')
          setId(''); setName(''); setUrl(''); setOpen(false)
        },
        onError: (e) => toast(String((e as Error).message), 'error'),
      },
    )
  }

  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> {t('manage.addCamera')}
      </Button>
    )

  const inp = 'h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3 text-sm focus:border-[var(--color-brand-500)] focus:outline-none'
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input value={id} onChange={(e) => setId(e.target.value)} placeholder="id (cam7)" className={`${inp} w-28`} required />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('manage.cameraName')} className={`${inp} w-40`} required />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="rtsp://… | http://…:8080/video" className={`${inp} min-w-56 flex-1`} required />
      <Button type="submit" size="sm" disabled={create.isPending}>{t('manage.add')}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{t('common.close')}</Button>
    </form>
  )
}

export function ManagePage() {
  const { t } = useTranslation()
  const cams = useManageCameras()
  const sys = useSystem()

  return (
    <>
      <PageHeader title={t('manage.title')} subtitle={t('manage.subtitle')} actions={<AddCameraForm />} />

      {cams.isLoading ? (
        <Spinner />
      ) : cams.isError || !cams.data ? (
        <EmptyState title={t('common.noConnection')} />
      ) : (
        <Card>
          <CardContent>
            {cams.data.map((cam) => (
              <CameraRow key={cam.id} cam={cam} />
            ))}
          </CardContent>
        </Card>
      )}

      {sys.data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Cpu size={16} className="text-[var(--color-violet-500)]" /> {t('system.ai')}
              </h2>
              <div className="space-y-1 text-sm">
                <Row label={t('system.detector')} value={sys.data.yolo_model} />
                <Row label={t('system.agent')} value={sys.data.agent_enabled ? t('system.on') : t('system.off')} />
                <Row label={t('system.vlm')} value={sys.data.vlm_enabled ? t('system.on') : t('system.off')} />
              </div>
            </CardContent>
          </Card>
          {sys.data.offline_mode && (
            <div className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-success-bg)] px-4 py-3 text-sm text-[var(--color-success-text)]">
              <ShieldCheck size={18} />
              {t('manage.offlineNote')}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
