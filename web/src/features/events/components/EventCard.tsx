import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { eventLabel, severityColor, severityTone, timeHMS } from '@/shared/lib/format'
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
      className="group flex w-full items-stretch gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-white text-left shadow-[var(--shadow-xs)] transition hover:border-[var(--color-brand-300)] hover:shadow-[var(--shadow-sm)]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="h-[68px] w-28 flex-shrink-0 overflow-hidden bg-black">
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
          <span className="truncate text-sm font-bold text-[var(--color-text-primary)]">
            {eventLabel(event.type, i18n.language)}
          </span>
          {event.people_in_zone && event.people_in_zone > 1 && (
            <StatusBadge tone={severityTone[event.severity] === 'danger' ? 'error' : 'neutral'} soft className="ml-1">
              <Users size={11} />
              {event.people_in_zone}
            </StatusBadge>
          )}
        </div>
        <p className="truncate text-xs text-[var(--color-text-muted)]" title={event.camera}>
          {event.camera}
          {event.zone ? ` · ${event.zone}` : ''}
        </p>
        {event.description && (
          <p className="truncate text-xs text-[var(--color-text-subtle)] italic">{event.description}</p>
        )}
      </div>

      <span className="flex flex-shrink-0 items-center pr-3 font-mono text-xs text-[var(--color-text-subtle)]">
        {timeHMS(event.t_start)}
      </span>
    </button>
  )
}
