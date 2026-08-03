import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client'
import { EmptyState, Modal, Skeleton, SkeletonList } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime } from '@/shared/lib/format'
import { MapPin } from '@/shared/ui/icons'
import type { PersonAppearance } from '@/shared/api/types'

// Один узел маршрута: точка + линия к следующему + кадр камеры
function Node({ item, last }: { item: PersonAppearance; last: boolean }) {
  const photo = useAuthedMedia(item.photo_url)
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-8 items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
          <MapPin size={16} />
        </span>
        {!last && <span className="w-px flex-1 bg-[var(--color-border-soft)]" />}
      </div>
      <div className="flex flex-1 items-center gap-3 pb-4">
        <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-black">
          {photo ? (
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-[var(--color-text-primary)]">{item.camera}</p>
          <p className="font-mono text-caption text-[var(--color-text-secondary)]">{dateTime(item.time)}</p>
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

  return (
    <Modal onClose={onClose}>
      <div className="mb-4 pr-8">
        <p className="text-h3">{t('search.timeline')}</p>
      </div>
      {/* маршрут за 48ч бывает длинным — скроллим внутри модалки, а не страницу */}
      <div className="max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <SkeletonList rows={4} className="h-12" />
        ) : !data || data.length === 0 ? (
          <EmptyState text={t('search.empty')} />
        ) : (
          data.map((a, i) => <Node key={i} item={a} last={i === data.length - 1} />)
        )}
      </div>
    </Modal>
  )
}
