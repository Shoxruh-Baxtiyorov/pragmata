import { useTranslation } from 'react-i18next'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { eventLabel, severityColor, timeHMS } from '@/shared/lib/format'
import { eventIcon, Users } from '@/shared/ui/icons'
import type { EventItem } from '@/shared/api/types'

export function EventCard({ event, onClick }: { event: EventItem; onClick: () => void }) {
  const { i18n } = useTranslation()
  const thumb = useAuthedMedia(event.photo_url)
  const Icon = eventIcon[event.type]
  const color = severityColor[event.severity]

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-stretch gap-3 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-left transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-2)]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="relative h-[68px] w-28 flex-shrink-0 overflow-hidden bg-black">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center" style={{ color }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-3">
        <div className="flex items-center gap-1.5">
          <Icon size={15} style={{ color }} className="flex-shrink-0" />
          <span className="truncate text-sm font-medium">{eventLabel(event.type, i18n.language)}</span>
          {event.people_in_zone && event.people_in_zone > 1 && (
            <span
              className="ml-1 inline-flex flex-shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[11px]"
              style={{ color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }}
            >
              <Users size={11} />
              {event.people_in_zone}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-[var(--color-muted)]" title={event.camera}>
          {event.camera}
          {event.zone ? ` · ${event.zone}` : ''}
        </p>
        {event.description && (
          <p className="truncate text-xs text-[var(--color-muted)] italic">{event.description}</p>
        )}
      </div>

      <span className="flex flex-shrink-0 items-center pr-3 font-mono text-xs text-[var(--color-muted)]">
        {timeHMS(event.t_start)}
      </span>
    </button>
  )
}
