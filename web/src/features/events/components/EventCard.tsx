import { useTranslation } from 'react-i18next'
import { Badge } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { eventLabel, severityColor, severityTone, timeHMS, type EventType } from '@/shared/lib/format'
import { eventIcon, ShieldAlert, Users } from '@/shared/ui/icons'
import type { EventOut, Severity } from '@/shared/api/types'

export function EventCard({ event, onClick }: { event: EventOut; onClick: () => void }) {
  const { i18n } = useTranslation()
  const thumb = useAuthedMedia(event.photo_url)
  const lang = (['ru', 'uz', 'en'].includes(i18n.language) ? i18n.language : 'uz') as 'ru' | 'uz' | 'en'
  const Icon = eventIcon[event.type as EventType] ?? ShieldAlert
  const color = severityColor[event.severity as Severity]

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-stretch gap-3 overflow-hidden rounded-card border border-border-default bg-surface text-left shadow-s transition hover:border-brand"
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
          <Icon size={16} style={{ color }} className="flex-shrink-0" />
          <span className="truncate text-body font-semibold text-text-primary">
            {eventLabel(event.type, lang)}
          </span>
          {event.people_in_zone && event.people_in_zone > 1 ? (
            <Badge tone={severityTone[event.severity as Severity]} className="ml-1 px-2 py-0.5">
              <Users size={16} />
              {event.people_in_zone}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-caption text-text-secondary" title={event.camera}>
          {event.camera}
          {event.zone ? ` · ${event.zone}` : ''}
        </p>
        {event.description ? (
          <p className="truncate text-caption text-text-placeholder italic">{event.description}</p>
        ) : null}
      </div>

      <span className="flex flex-shrink-0 items-center pr-3 font-mono text-caption text-text-secondary">
        {timeHMS(event.t_start)}
      </span>
    </button>
  )
}
