import { useTranslation } from 'react-i18next'
import { Card } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { eventIcon, severityColor, timeHMS } from '@/shared/lib/format'
import type { EventItem } from '@/shared/api/types'

export function EventCard({ event, onClick }: { event: EventItem; onClick: () => void }) {
  const { t } = useTranslation()
  const thumb = useAuthedMedia(event.photo_url)
  return (
    <Card
      className="flex cursor-pointer gap-3 overflow-hidden p-2 transition hover:border-[var(--color-accent)]"
    >
      <button onClick={onClick} className="flex w-full gap-3 text-left">
        <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-black">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-lg">
              {eventIcon[event.type]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span style={{ color: severityColor[event.severity] }}>{eventIcon[event.type]}</span>
            <span className="truncate text-sm font-medium">{event.type}</span>
          </div>
          <p className="truncate text-xs text-[var(--color-muted)]" title={event.camera}>
            {event.camera}
            {event.zone ? ` · ${event.zone}` : ''}
          </p>
          {event.description && (
            <p className="truncate text-xs text-[var(--color-muted)]">🧠 {event.description}</p>
          )}
          {event.people_in_zone && event.people_in_zone > 1 && (
            <p className="text-xs text-[var(--color-warning)]">
              {t('events.people')}: {event.people_in_zone}
            </p>
          )}
        </div>
        <span className="flex-shrink-0 font-mono text-xs text-[var(--color-muted)]">
          {timeHMS(event.t_start)}
        </span>
      </button>
    </Card>
  )
}
