import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client'
import { Modal, SkeletonList } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime } from '@/shared/lib/format'
import { MapPin, X } from '@/shared/ui/icons'
import type { PersonAppearance } from '@/shared/api/types'

// Один узел маршрута: точка + линия к следующему + кадр камеры
function Node({ item, last }: { item: PersonAppearance; last: boolean }) {
  const photo = useAuthedMedia(item.photo_url)
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-10 text-brand">
          <MapPin size={16} />
        </span>
        {!last && <span className="w-px flex-1 bg-border-default" />}
      </div>
      <div className="flex flex-1 items-center gap-3 pb-4">
        <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-input bg-black">
          {photo && <img src={photo} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-text-primary">{item.camera}</p>
          <p className="font-mono text-caption text-text-secondary">{dateTime(item.time)}</p>
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
      <div className="mb-4 flex items-center justify-between">
        <p className="text-h2">{t('search.timeline')}</p>
        <button
          onClick={onClose}
          className="rounded-input p-1.5 text-text-secondary hover:bg-bg-secondary"
        >
          <X size={20} />
        </button>
      </div>
      {isLoading ? (
        <SkeletonList rows={4} className="h-12" />
      ) : !data || data.length === 0 ? (
        <p className="py-8 text-center text-body text-text-secondary">{t('search.empty')}</p>
      ) : (
        data.map((a, i) => <Node key={i} item={a} last={i === data.length - 1} />)
      )}
    </Modal>
  )
}
