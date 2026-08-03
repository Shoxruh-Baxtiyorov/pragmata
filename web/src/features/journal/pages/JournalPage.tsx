import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, EmptyState, PageHeader, SkeletonList, StaleBadge } from '@/shared/ui'
import { ArrowRight, User } from '@/shared/ui/icons'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { cn } from '@/shared/lib/utils'
import type { Appearance } from '@/shared/api/types'
import { useAppearances } from '../api/journalApi'

function hhmm(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const same = d.toDateString() === today.toDateString()
  return same ? '' : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}
function dur(sec: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (sec < 60) return t('journal.durSec', { n: Math.round(sec) })
  return t('journal.durMin', { n: Math.round(sec / 60) })
}

const CAT_TONE: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'error'> = {
  employee: 'success',
  visitor: 'brand',
  contractor: 'neutral',
  watchlist: 'warning',
  banned: 'error',
  other: 'neutral',
}

function Thumb({ url }: { url: string | null }) {
  const src = useAuthedMedia(url)
  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-muted)]">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full place-items-center text-[var(--color-text-muted)]">
          <User size={18} />
        </div>
      )}
    </div>
  )
}

function Row({ a }: { a: Appearance }) {
  const { t } = useTranslation()
  const named = Boolean(a.person_name)
  const d = dayLabel(a.entered)
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border-soft)] px-3 py-2.5 transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-[var(--color-row-alt)]">
      <Thumb url={a.photo_url} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-sm font-bold',
              named ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]',
            )}
          >
            {a.person_name ?? t('journal.unknown')}
          </span>
          {a.watch && <Badge tone="error">{t('journal.watch')}</Badge>}
          {!a.watch && a.category && (
            <Badge tone={CAT_TONE[a.category] ?? 'neutral'}>{t(`people.cat.${a.category}`)}</Badge>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{a.camera}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <span className="tabular-nums text-[var(--color-text-primary)]">{hhmm(a.entered)}</span>
        <ArrowRight size={16} className="text-[var(--color-text-muted)]" />
        <span className="tabular-nums text-[var(--color-text-primary)]">{hhmm(a.left)}</span>
        <span className="hidden w-14 text-right tabular-nums text-[var(--color-text-muted)] sm:inline">
          {dur(a.duration_s, t)}
        </span>
        {d && <span className="hidden tabular-nums text-[var(--color-text-muted)] md:inline">{d}</span>}
      </div>
    </div>
  )
}

export function JournalPage() {
  const { t } = useTranslation()
  const [onlyNamed, setOnlyNamed] = useState(false)
  const q = useAppearances(onlyNamed)

  const chips: { key: boolean; label: string }[] = [
    { key: false, label: t('journal.all') },
    { key: true, label: t('journal.named') },
  ]

  return (
    <div>
      <PageHeader title={t('journal.title')} subtitle={t('journal.subtitle')} />

      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={String(c.key)}
            type="button"
            aria-pressed={onlyNamed === c.key}
            onClick={() => setOnlyNamed(c.key)}
            className={cn(
              'rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-semibold outline-none transition-colors duration-[var(--dur-fast)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]',
              onlyNamed === c.key
                ? 'bg-[var(--color-brand-500)] text-white'
                : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {c.label}
          </button>
        ))}
        <StaleBadge show={q.isError && !!q.data} className="self-center" />
        {q.data && (
          <span className="ml-auto self-center text-xs tabular-nums text-[var(--color-text-muted)]">
            {t('journal.count', { count: q.data.total })}
          </span>
        )}
      </div>

      {q.isLoading ? (
        <SkeletonList rows={6} className="h-16" />
      ) : q.isError && !q.data ? (
        // Журнал обновляется каждые 5с — на разовом сбое список не гасим
        <EmptyState text={apiErrorMessage(q.error, t)} onRetry={() => void q.refetch()} />
      ) : !q.data || q.data.items.length === 0 ? (
        <EmptyState text={t('journal.empty')} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)]">
          {q.data.items.map((a) => (
            <Row key={a.track_id} a={a} />
          ))}
        </div>
      )}
    </div>
  )
}
