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
import { DoorOpen, ScanFace, X } from '@/shared/ds/icons'
import { PERSON_CATEGORIES, type Turnstile } from '@/shared/api/types'
import { useManageCameras } from '@/features/manage/api/manageApi'
import { usePersons } from '@/features/watchlist/api/watchlistApi'
import {
  useCreateTurnstile,
  useDeleteTurnstile,
  useFaceOpen,
  useOpenTurnstile,
  useTurnstiles,
} from '../api/turnstilesApi'

// категории, которые можно допускать (бан не допускается никогда)
const ALLOWABLE = PERSON_CATEGORIES.filter((c) => c !== 'banned')

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
  // политика авто-открытия по лицу
  const [requireLive, setRequireLive] = useState(true)
  const [minSim, setMinSim] = useState(0.55)
  const [allowCats, setAllowCats] = useState<Set<string>>(new Set())

  const cameras = cams.data ?? []
  const camName = (id: string | null) => cameras.find((c) => c.id === id)?.name ?? '—'

  const reset = () => {
    setName('')
    setCameraId('')
    setConnector('null')
    setMode('monitor')
    setUrl('')
    setRequireLive(true)
    setMinSim(0.55)
    setAllowCats(new Set())
    setAdding(false)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const config: Record<string, unknown> = {}
    if (connector === 'relay') config.url = url.trim()
    if (mode === 'face_open') {
      config.require_liveness = requireLive
      config.min_similarity = minSim
      config.allow_categories = [...allowCats]
    }
    create.mutate(
      { name: name.trim(), camera_id: cameraId || null, connector, mode, config },
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

  const toggleCat = (c: string) =>
    setAllowCats((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
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
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>{t('turnstiles.name')}</FieldLabel>
                <Input className="w-52" value={name} onChange={(e) => setName(e.target.value)} required />
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
            </div>

            {/* политика авто-открытия по лицу */}
            {mode === 'face_open' && (
              <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] p-3">
                <div className="text-label font-semibold text-[var(--color-text-secondary)]">
                  {t('turnstiles.policy')}
                </div>
                <label className="flex items-center gap-2 text-body text-[var(--color-text-primary)]">
                  <input
                    type="checkbox"
                    checked={requireLive}
                    onChange={(e) => setRequireLive(e.target.checked)}
                    className="size-4 accent-[var(--color-brand-500)]"
                  />
                  {t('turnstiles.liveness')}
                </label>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>{t('turnstiles.minSim')}: {minSim.toFixed(2)}</FieldLabel>
                  <input
                    type="range"
                    min={0.3}
                    max={0.9}
                    step={0.05}
                    value={minSim}
                    onChange={(e) => setMinSim(Number(e.target.value))}
                    className="w-64 accent-[var(--color-brand-500)]"
                  />
                </div>
                <div>
                  <FieldLabel>{t('turnstiles.allowCats')}</FieldLabel>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {ALLOWABLE.map((c) => (
                      <label key={c} className="flex items-center gap-1.5 text-caption text-[var(--color-text-primary)]">
                        <input
                          type="checkbox"
                          checked={allowCats.has(c)}
                          onChange={() => toggleCat(c)}
                          className="size-4 accent-[var(--color-brand-500)]"
                        />
                        {t(`people.cat.${c}`)}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-caption text-[var(--color-text-subtle)]">
                    {t('turnstiles.allowCatsHint')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" loading={create.isPending}>
                {t('turnstiles.create')}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t('common.close')}
              </Button>
            </div>
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
            <TurnstileCard
              key={tr.id}
              tr={tr}
              camName={camName}
              onOpen={() => doOpen(tr.id)}
              onDelete={() => doDelete(tr.id)}
              opening={open.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TurnstileCard({
  tr,
  camName,
  onOpen,
  onDelete,
  opening,
}: {
  tr: Turnstile
  camName: (id: string | null) => string
  onOpen: () => void
  onDelete: () => void
  opening: boolean
}) {
  const { t } = useTranslation()
  const [testing, setTesting] = useState(false)
  const isFace = tr.mode === 'face_open'

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[var(--color-text-primary)]">{tr.name}</span>
            <Badge tone={isFace ? 'brand' : 'neutral'}>
              {t(`turnstiles.mode${isFace ? 'FaceOpen' : 'Monitor'}`)}
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
          {isFace && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTesting((v) => !v)}
              title={t('turnstiles.faceTest')}
            >
              <ScanFace size={15} /> {t('turnstiles.faceTest')}
            </Button>
          )}
          <Button size="sm" onClick={onOpen} loading={opening}>
            <DoorOpen size={15} /> {t('turnstiles.open')}
          </Button>
          <IconButton aria-label={t('turnstiles.delete')} size={32} onClick={onDelete}>
            <X size={16} />
          </IconButton>
        </div>
      </div>

      {isFace && testing && <FaceTest turnstile={tr} />}
    </Card>
  )
}

// «Проверить лицо»: имитирует on-device сканер (выбор человека + флаг живости)
function FaceTest({ turnstile }: { turnstile: Turnstile }) {
  const { t } = useTranslation()
  const persons = usePersons()
  const face = useFaceOpen()
  const [personId, setPersonId] = useState('')
  const [live, setLive] = useState(true)

  const people = persons.data ?? []

  const run = () => {
    if (!personId) return
    face.mutate(
      { id: turnstile.id, person_id: personId, similarity: 0.9, live },
      {
        onSuccess: (r) => {
          if (r.open) toast.success(t('turnstiles.faceAllowed', { name: r.person ?? '' }))
          else
            toast.error(
              t('turnstiles.faceDenied', {
                reason: t(`turnstiles.r.${r.reason}`, { defaultValue: r.reason }),
              }),
            )
        },
        onError: () => toast.error(t('common.noConnection')),
      },
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] p-3">
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <FieldLabel>{t('turnstiles.person')}</FieldLabel>
        <Select value={personId} onChange={setPersonId}>
          <option value="">—</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.category ? ` · ${t(`people.cat.${p.category}`, { defaultValue: p.category })}` : ''}
            </option>
          ))}
        </Select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-body text-[var(--color-text-primary)]">
        <input
          type="checkbox"
          checked={live}
          onChange={(e) => setLive(e.target.checked)}
          className="size-4 accent-[var(--color-brand-500)]"
        />
        {t('turnstiles.live')}
      </label>
      <Button size="sm" onClick={run} loading={face.isPending} disabled={!personId}>
        <ScanFace size={15} /> {t('turnstiles.run')}
      </Button>
    </div>
  )
}
