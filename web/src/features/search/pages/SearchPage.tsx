import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, EmptyState, PageHeader } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime } from '@/shared/lib/format'
import { MapPin, Search } from '@/shared/ui/icons'
import type { FindItem } from '@/shared/api/types'
import { useSearch } from '../api/searchApi'
import { TimelineModal } from '../components/TimelineModal'

function trackIdFromUrl(url: string | null): string | null {
  const m = url?.match(/\/tracks\/([0-9a-f-]+)\/photo/)
  return m ? m[1] : null
}

function ResultCard({ item, onTimeline }: { item: FindItem; onTimeline: (id: string) => void }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(item.photo_url)
  const trackId = trackIdFromUrl(item.photo_url)
  return (
    <Card>
      <div className="aspect-3/4 bg-black">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full animate-pulse bg-[var(--color-bg-muted)]" />
        )}
      </div>
      <div className="px-3">
        <p className="truncate text-sm font-medium" title={item.camera}>
          {item.camera}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {dateTime(item.time)} · {t('search.similarity')} {Math.round(item.similarity * 100)}%
        </p>
        {trackId && (
          <Button variant="ghost" size="xs" className="mt-1 -ml-1.5" onClick={() => onTimeline(trackId)}>
            <MapPin size={13} /> {t('search.timeline')}
          </Button>
        )}
      </div>
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

      <form onSubmit={onSubmit} className="mb-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('search.placeholder')}
            className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white pl-9 pr-3 text-sm focus:border-[var(--color-brand-500)] focus:outline-none"
          />
        </div>
        <Button type="submit" disabled={search.isPending || q.trim().length < 3}>
          {t('search.submit')}
        </Button>
      </form>

      {search.isError && <EmptyState title={t('common.noConnection')} />}
      {res?.disabled && <EmptyState title={t('search.disabled')} />}
      {res?.message && <p className="text-sm text-[var(--color-warning-text)]">{res.message}</p>}
      {res && !res.disabled && res.items.length === 0 && !res.message && <EmptyState title={t('search.empty')} />}
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
