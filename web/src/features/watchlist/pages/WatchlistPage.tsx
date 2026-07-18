import { useTranslation } from 'react-i18next'
import { Card, EmptyState, PageHeader, Spinner, StatusBadge } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { useToast } from '@/shared/ui/toast'
import { Bell, BellOff, Trash2, UserPlus } from '@/shared/ui/icons'
import type { Person } from '@/shared/api/types'
import { useDeletePerson, usePatchPerson, usePersons } from '../api/watchlistApi'

function PersonCard({ p }: { p: Person }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(p.photo_url)
  const patch = usePatchPerson()
  const del = useDeletePerson()
  const toast = useToast()
  return (
    <Card>
      <div className="aspect-3/4 bg-black">
        {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <div className="h-full animate-pulse bg-[var(--color-bg-muted)]" />}
      </div>
      <div className="space-y-1 px-3 pb-1">
        <p className="truncate text-sm font-bold" title={p.name}>{p.name}</p>
        {p.note && <p className="truncate text-xs text-[var(--color-text-muted)]">{p.note}</p>}
        <p className="text-xs text-[var(--color-text-subtle)]">{t('watchlist.seen')}: {p.seen_count}</p>
        {p.watch && <StatusBadge tone="error"><Bell size={11} /> {t('watchlist.watched')}</StatusBadge>}
      </div>
      <div className="flex gap-1 px-2 pb-2">
        <button
          className="flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-md)] py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]"
          onClick={() => patch.mutate({ id: p.id, patch: { watch: !p.watch } })}
        >
          {p.watch ? <BellOff size={13} /> : <Bell size={13} />}
          {p.watch ? t('watchlist.unwatch') : t('watchlist.watch')}
        </button>
        <button
          className="rounded-[var(--radius-md)] px-2 text-[var(--color-danger-500)] hover:bg-[var(--color-danger-bg)]"
          onClick={() => { del.mutate(p.id); toast(t('manage.deleted'), 'ok') }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  )
}

export function WatchlistPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = usePersons()

  return (
    <>
      <PageHeader title={t('watchlist.title')} subtitle={t('watchlist.subtitle')} />
      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState title={t('common.noConnection')} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t('watchlist.empty')} hint={t('watchlist.emptyHint')} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.map((p) => (
            <PersonCard key={p.id} p={p} />
          ))}
        </div>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <UserPlus size={15} /> {t('watchlist.addHint')}
      </p>
    </>
  )
}
