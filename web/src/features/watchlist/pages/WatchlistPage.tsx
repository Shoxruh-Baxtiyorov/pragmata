import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  SkeletonGrid,
} from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { ApiError } from '@/shared/api/client'
import { cn } from '@/shared/lib/utils'
import { Bell, BellOff, ImagePlus, Trash2, UserPlus, X } from '@/shared/ui/icons'
import { PersonPhotos } from '../components/PersonPhotos'
import { PERSON_CATEGORIES, type Person } from '@/shared/api/types'
import {
  useDeletePerson,
  useEnrollPerson,
  usePatchPerson,
  usePersons,
} from '../api/watchlistApi'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error'
const CAT_TONE: Record<string, BadgeTone> = {
  employee: 'success',
  visitor: 'brand',
  contractor: 'neutral',
  watchlist: 'warning',
  banned: 'error',
  other: 'neutral',
}

function PersonCard({ p }: { p: Person }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(p.photo_url)
  const patch = usePatchPerson()
  const del = useDeletePerson()
  const [photosOpen, setPhotosOpen] = useState(false)

  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[3/4] bg-black">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-bg-secondary text-text-placeholder">
            <UserPlus size={28} />
          </div>
        )}
      </div>
      <div className="space-y-1 px-3 pt-2">
        <p className="truncate text-body font-medium text-text-primary" title={p.name}>
          {p.name}
        </p>
        <Badge tone={CAT_TONE[p.category] ?? 'neutral'}>{t(`people.cat.${p.category}`)}</Badge>
        {p.position && (
          <p className="truncate text-caption text-text-secondary" title={p.position}>
            {p.position}
          </p>
        )}
        <p className="text-caption text-text-secondary">
          {t('watchlist.seen')}: {p.seen_count} · {t('people.photoCount', { count: p.photo_count })}
        </p>
      </div>
      <div className="flex gap-1 p-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => patch.mutate({ id: p.id, patch: { watch: !p.watch } })}
        >
          {p.watch ? <BellOff size={14} /> : <Bell size={14} />}
          {p.watch ? t('watchlist.unwatch') : t('watchlist.watch')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPhotosOpen(true)}
          title={t('watchlist.photos')}
        >
          <ImagePlus size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => del.mutate(p.id)}>
          <Trash2 size={14} />
        </Button>
      </div>

      {photosOpen && <PersonPhotos person={p} onClose={() => setPhotosOpen(false)} />}
    </Card>
  )
}

function RegisterForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const enroll = useEnrollPerson()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('employee')
  const [position, setPosition] = useState('')
  const [note, setNote] = useState('')
  const [watch, setWatch] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || files.length === 0) return
    enroll.mutate(
      { name: name.trim(), category, position: position.trim(), note: note.trim(), watch, files },
      { onSuccess: onClose },
    )
  }

  return (
    <Card className="mb-4 p-4">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            className="w-48"
            placeholder={t('people.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Select value={category} onChange={setCategory}>
            {PERSON_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`people.cat.${c}`)}
              </option>
            ))}
          </Select>
          <Input
            className="w-48"
            placeholder={t('people.position')}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
          <Input
            className="min-w-48 flex-1"
            placeholder={t('people.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-body text-text-secondary">
          <input type="checkbox" checked={watch} onChange={(e) => setWatch(e.target.checked)} />
          {t('people.alertOnSeen')}
        </label>

        <div>
          <label className="mb-1 block text-label text-text-secondary">
            {t('people.photos')} — {t('people.photosHint')}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 8))}
            className="text-body text-text-secondary file:mr-3 file:rounded-button file:border-0 file:bg-brand-10 file:px-3 file:py-1.5 file:text-brand"
          />
          {previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="size-16 rounded-input border border-border-default object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-error p-0.5 text-on-brand"
                    onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {enroll.isError && (
          <p className="text-label text-error">
            {enroll.error instanceof ApiError ? enroll.error.message : t('common.noConnection')}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={enroll.isPending} disabled={!name.trim() || !files.length}>
            {t('people.submit')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function WatchlistPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<string>('all')
  const [registering, setRegistering] = useState(false)
  const { data, isLoading, isError, refetch } = usePersons(filter === 'all' ? undefined : filter)

  const chips = ['all', ...PERSON_CATEGORIES]

  return (
    <>
      <PageHeader
        title={t('watchlist.title')}
        subtitle={t('watchlist.subtitle')}
        actions={
          <Button onClick={() => setRegistering((v) => !v)}>
            <UserPlus size={16} /> {t('people.register')}
          </Button>
        }
      />

      {registering && <RegisterForm onClose={() => setRegistering(false)} />}

      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              'rounded-pill px-3 py-1 text-caption font-medium',
              filter === c
                ? 'bg-brand text-on-brand'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary',
            )}
          >
            {c === 'all' ? t('people.filterAll') : t(`people.cat.${c}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : isError ? (
        <EmptyState text={t('common.noConnection')} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState text={`${t('watchlist.empty')} — ${t('watchlist.emptyHint')}`} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.map((p) => (
            <PersonCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </>
  )
}
