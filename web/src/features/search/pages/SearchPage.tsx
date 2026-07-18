import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, EmptyState, Input, PageHeader } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime } from '@/shared/lib/format'
import { MapPin, Search } from '@/shared/ui/icons'
import type { FindItem } from '@/shared/api/types'
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

  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[3/4] bg-black">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full animate-pulse bg-bg-secondary" />
        )}
      </div>
      <div className="px-3 pt-2">
        <p className="truncate text-body font-medium text-text-primary" title={item.camera}>
          {item.camera}
        </p>
        <p className="text-caption text-text-secondary">
          {dateTime(item.time)} · {t('search.similarity')} {Math.round(item.similarity * 100)}%
        </p>
      </div>
      {trackId && (
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onTimeline(trackId)}
          >
            <MapPin size={16} /> {t('search.timeline')}
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

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (q.trim().length >= 3) search.mutate({ description: q.trim(), hours: 48 })
  }

  const res = search.data
  return (
    <>
      <PageHeader title={t('search.title')} subtitle={t('search.subtitle')} />

      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={search.isPending || q.trim().length < 3}>
          {t('search.submit')}
        </Button>
      </form>

      {search.isError && <EmptyState text={t('common.noConnection')} />}
      {res?.disabled && <EmptyState text={t('search.disabled')} />}
      {res?.message && <p className="text-body text-warning">{res.message}</p>}
      {res && !res.disabled && res.items.length === 0 && !res.message && (
        <EmptyState text={t('search.empty')} />
      )}
      {res && res.items.length > 0 && (
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
