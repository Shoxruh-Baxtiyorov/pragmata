import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { Bell, BellOff, Trash2 } from '@/shared/ui/icons'
import type { Person } from '@/shared/api/types'
import { useDeletePerson, usePatchPerson, usePersons } from '../api/watchlistApi'

function PersonCard({ p }: { p: Person }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(p.photo_url)
  const patch = usePatchPerson()
  const del = useDeletePerson()

  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[3/4] bg-black">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full animate-pulse bg-bg-secondary" />
        )}
      </div>
      <div className="space-y-1 px-3 pt-2">
        <p className="truncate text-body font-medium text-text-primary" title={p.name}>
          {p.name}
        </p>
        {p.note && <p className="truncate text-caption text-text-secondary">{p.note}</p>}
        <p className="text-caption text-text-secondary">
          {t('watchlist.seen')}: {p.seen_count}
        </p>
        {p.watch && (
          <Badge tone="error">
            <Bell size={11} /> {t('watchlist.watched')}
          </Badge>
        )}
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
        <Button variant="ghost" size="sm" onClick={() => del.mutate(p.id)}>
          <Trash2 size={14} />
        </Button>
      </div>
    </Card>
  )
}

export function WatchlistPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = usePersons()

  return (
    <>
      <PageHeader title={t('watchlist.title')} subtitle={t('watchlist.subtitle')} />
      {isLoading ? (
        <Spinner />
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
