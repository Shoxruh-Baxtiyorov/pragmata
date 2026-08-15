import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FieldLabel,
  Input,
  PageHeader,
  Select,
  SkeletonGrid,
} from '@/shared/ui'
import { IconButton } from '@/shared/ds'
import { DoorOpen, X } from '@/shared/ds/icons'
import { useManageCameras } from '@/features/manage/api/manageApi'
import {
  useCreateTurnstile,
  useDeleteTurnstile,
  useOpenTurnstile,
  useTurnstiles,
} from '../api/turnstilesApi'

export function TurnstilesPage() {
  const { t } = useTranslation()
  const list = useTurnstiles()
  const cams = useManageCameras()
  const create = useCreateTurnstile()
  const del = useDeleteTurnstile()
  const open = useOpenTurnstile()

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [cameraId, setCameraId] = useState('')
  const [connector, setConnector] = useState('null')
  const [mode, setMode] = useState('monitor')
  const [url, setUrl] = useState('')

  const cameras = cams.data ?? []
  const camName = (id: string | null) => cameras.find((c) => c.id === id)?.name ?? '—'

  const reset = () => {
    setName('')
    setCameraId('')
    setConnector('null')
    setMode('monitor')
    setUrl('')
    setAdding(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    create.mutate(
      {
        name: name.trim(),
        camera_id: cameraId || null,
        connector,
        mode,
        config: connector === 'relay' ? { url: url.trim() } : {},
      },
      {
        onSuccess: () => {
          reset()
          toast.success(t('turnstiles.created'))
        },
        onError: () => toast.error(t('common.noConnection')),
      },
    )
  }

  const doOpen = (id: string) =>
    open.mutate(id, {
      onSuccess: (r) =>
        r.ok ? toast.success(t('turnstiles.opened')) : toast.error(t('turnstiles.openFail')),
      onError: () => toast.error(t('turnstiles.openFail')),
    })

  const doDelete = (id: string) =>
    del.mutate(id, {
      onSuccess: () => toast.success(t('turnstiles.deleted')),
      onError: () => toast.error(t('common.noConnection')),
    })

  return (
    <div>
      <PageHeader
        title={t('turnstiles.title')}
        subtitle={t('turnstiles.subtitle')}
        actions={
          <Button onClick={() => setAdding((v) => !v)}>
            <DoorOpen size={16} /> {t('turnstiles.add')}
          </Button>
        }
      />

      {adding && (
        <Card className="mb-4 p-4">
          <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t('turnstiles.name')}</FieldLabel>
              <Input
                className="w-52"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t('turnstiles.camera')}</FieldLabel>
              <Select value={cameraId} onChange={setCameraId}>
                <option value="">{t('turnstiles.noCamera')}</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t('turnstiles.mode')}</FieldLabel>
              <Select value={mode} onChange={setMode}>
                <option value="monitor">{t('turnstiles.modeMonitor')}</option>
                <option value="face_open">{t('turnstiles.modeFaceOpen')}</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t('turnstiles.connector')}</FieldLabel>
              <Select value={connector} onChange={setConnector}>
                <option value="null">{t('turnstiles.connNull')}</option>
                <option value="relay">{t('turnstiles.connRelay')}</option>
              </Select>
            </div>
            {connector === 'relay' && (
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t('turnstiles.url')}</FieldLabel>
                <Input
                  className="w-64"
                  placeholder="http://192.168.1.50/relay/on"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" loading={create.isPending}>
              {t('turnstiles.create')}
            </Button>
            <Button type="button" onClick={reset}>
              {t('common.close')}
            </Button>
          </form>
        </Card>
      )}

      {list.isLoading ? (
        <SkeletonGrid count={4} item="h-28" cols="grid-cols-1 gap-3 lg:grid-cols-2" />
      ) : list.isError ? (
        <EmptyState text={t('turnstiles.noAccess')} />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState text={t('turnstiles.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {(list.data ?? []).map((tr) => (
            <Card key={tr.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">
                    {tr.name}
                  </span>
                  <Badge tone={tr.mode === 'face_open' ? 'brand' : 'neutral'}>
                    {t(`turnstiles.mode${tr.mode === 'face_open' ? 'FaceOpen' : 'Monitor'}`)}
                  </Badge>
                  <Badge tone="neutral">
                    {t(`turnstiles.conn${tr.connector === 'relay' ? 'Relay' : 'Null'}`)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {t('turnstiles.camera')}: {camName(tr.camera_id)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" onClick={() => doOpen(tr.id)} loading={open.isPending}>
                  <DoorOpen size={15} /> {t('turnstiles.open')}
                </Button>
                <IconButton aria-label={t('turnstiles.delete')} size={32} onClick={() => doDelete(tr.id)}>
                  <X size={16} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
