import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, EmptyState } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime } from '@/shared/lib/format'
import type { FindItem } from '@/shared/api/types'
import { useSearch } from '../api/searchApi'

function ResultCard({ item }: { item: FindItem }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(item.photo_url)
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-black">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full animate-pulse bg-[var(--color-surface-2)]" />
        )}
      </div>
      <div className="p-2 text-sm">
        <p className="truncate" title={item.camera}>
          {item.camera}
        </p>
        <p className="text-xs text-[var(--color-muted)]">
          {dateTime(item.time)} · {t('search.similarity')} {Math.round(item.similarity * 100)}%
        </p>
      </div>
    </Card>
  )
}

export function SearchPage() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const search = useSearch()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (q.trim().length >= 3) search.mutate({ description: q.trim(), hours: 48 })
  }

  const res = search.data
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search.placeholder')}
          className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
        <Button type="submit" disabled={search.isPending || q.trim().length < 3}>
          {t('search.submit')}
        </Button>
      </form>

      {search.isError && <EmptyState title={t('common.noConnection')} />}
      {res?.disabled && <EmptyState title={t('search.disabled')} />}
      {res?.message && <p className="text-sm text-[var(--color-warning)]">{res.message}</p>}
      {res && !res.disabled && res.items.length === 0 && !res.message && (
        <EmptyState title={t('search.empty')} />
      )}
      {res && res.items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {res.items.map((it, i) => (
            <ResultCard key={i} item={it} />
          ))}
        </div>
      )}
    </div>
  )
}
