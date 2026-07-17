import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client'
import { Spinner } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime } from '@/shared/lib/format'
import { MapPin, X } from '@/shared/ui/icons'
import type { PersonAppearance } from '@/shared/api/types'

function Node({ item, last }: { item: PersonAppearance; last: boolean }) {
  const photo = useAuthedMedia(item.photo_url)
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
          <MapPin size={15} />
        </span>
        {!last && <span className="w-px flex-1 bg-[var(--color-border-strong)]" />}
      </div>
      <div className="flex flex-1 items-center gap-3 pb-4">
        <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black">
          {photo && <img src={photo} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.camera}</p>
          <p className="font-mono text-xs text-[var(--color-text-muted)]">{dateTime(item.time)}</p>
        </div>
      </div>
    </div>
  )
}

export function TimelineModal({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['timeline', trackId],
    queryFn: () => api.get<PersonAppearance[]>(`/api/v1/tracks/${trackId}/timeline?hours=48`),
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-neutral-900)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-[var(--radius-xl)] border border-[var(--color-border-soft)] bg-white shadow-[var(--shadow-modal)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] p-4">
          <p className="font-heading font-bold">{t('search.timeline')}</p>
          <button onClick={onClose} className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <Spinner />
          ) : !data || data.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">{t('search.empty')}</p>
          ) : (
            data.map((a, i) => <Node key={i} item={a} last={i === data.length - 1} />)
          )}
        </div>
      </div>
    </div>
  )
}
