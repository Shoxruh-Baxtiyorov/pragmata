import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  PageHeader,
  Skeleton,
  SkeletonGrid,
} from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime } from '@/shared/lib/format'
import { MapPin, Search, UserPlus } from '@/shared/ui/icons'
import type { FindItem } from '@/shared/api/types'
import { useCreatePerson } from '@/features/watchlist'
import { useSearch } from '../api/searchApi'
import { TimelineModal } from '../components/TimelineModal'

// photo_url вида /api/v1/tracks/<uuid>/photo → вытащить track_id для маршрута
function trackIdFromUrl(url: string | null): string | null {
  const m = url?.match(/\/tracks\/([0-9a-f-]+)\/photo/)
  return m ? m[1] : null
}

function ResultCard({ item, onTimeline }: { item: FindItem; onTimeline: (id: string) => void }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(item.photo_url)
  const trackId = trackIdFromUrl(item.photo_url)
  const createPerson = useCreatePerson()

  function addToWatchlist() {
    if (!trackId || createPerson.isPending) return
    const name = window.prompt(t('watchlist.namePrompt'))
    if (name) {
      createPerson.mutate(
        { name, watch: true, track_id: trackId },
        { onError: () => window.alert(t('assistant.error')) },
      )
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden p-0 transition hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]">
      <div className="relative aspect-[3/4] bg-black">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <Skeleton className="h-full w-full" />
        )}
        {/* совпадение — главный признак ранжирования, поверх кадра нейтральной плашкой */}
        <span
          title={t('search.similarity')}
          className="absolute right-2 top-2 rounded-pill bg-black/65 px-2 py-0.5 font-mono text-caption text-white backdrop-blur-sm"
        >
          {Math.round(item.similarity * 100)}%
        </span>
      </div>
      <div className="flex-1 space-y-0.5 px-3 py-3">
        <p className="truncate text-body font-medium text-[var(--color-text-primary)]" title={item.camera}>
          {item.camera}
        </p>
        <p className="font-mono text-caption text-[var(--color-text-secondary)]">{dateTime(item.time)}</p>
      </div>
      {trackId && (
        <div className="flex gap-2 px-2 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onTimeline(trackId)}
          >
            <MapPin size={16} /> {t('search.timeline')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={addToWatchlist}
            loading={createPerson.isPending}
          >
            <UserPlus size={16} /> {t('watchlist.addToList')}
          </Button>
        </div>
      )}
    </Card>
  )
}

export function SearchPage() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [timeline, setTimeline] = useState<string | null>(null)
  const search = useSearch()

  const runSearch = () => search.mutate({ description: q.trim(), hours: 48 })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (q.trim().length >= 3) runSearch()
  }

  const res = search.data
  return (
    <>
      <PageHeader title={t('search.title')} subtitle={t('search.subtitle')} />

      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="pl-9"
          />
        </div>
        <Button type="submit" loading={search.isPending} disabled={q.trim().length < 3}>
          {t('search.submit')}
        </Button>
      </form>

      {search.isPending ? (
        <SkeletonGrid />
      ) : search.isError ? (
        <EmptyState
          text={t('common.noConnection')}
          onRetry={q.trim().length >= 3 ? runSearch : undefined}
        />
      ) : !res ? (
        // ещё не искали — пример запроса вместо пустого экрана
        <EmptyState text={t('search.placeholder')} />
      ) : res.disabled ? (
        <EmptyState text={t('search.disabled')} />
      ) : res.message ? (
        <ErrorNote tone="warning">{res.message}</ErrorNote>
      ) : res.items.length === 0 ? (
        <EmptyState text={t('search.empty')} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {res.items.map((it, i) => (
            <ResultCard key={i} item={it} onTimeline={setTimeline} />
          ))}
        </div>
      )}

      {timeline && <TimelineModal trackId={timeline} onClose={() => setTimeline(null)} />}
    </>
  )
}
