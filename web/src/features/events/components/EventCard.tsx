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
      className="group flex w-full items-stretch gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] text-left shadow-[var(--shadow-xs)] outline-none transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)] hover:shadow-[var(--shadow-sm)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* 128×72 = 16:9, как кадр камеры — превью не режется по краям */}
      <div className="h-18 w-32 flex-shrink-0 overflow-hidden bg-black">
        {thumb ? (
          <img src={thumb} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center" style={{ color }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-2 pr-3">
        <div className="flex items-center gap-1.5">
          <Icon size={16} style={{ color }} className="flex-shrink-0" />
          <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {eventLabel(event.type, lang)}
          </span>
          {/* brand-text, а не brand-500: на тёмной теме синий 500 не добирает контраст */}
          {event.person ? (
            <span className="truncate text-sm font-semibold text-[var(--color-brand-text)]">
              · {event.person}
            </span>
          ) : null}
          {event.people_in_zone && event.people_in_zone > 1 ? (
            <Badge tone={severityTone[event.severity as Severity]} className="ml-1 px-2 py-0.5">
              <Users size={16} />
              {event.people_in_zone}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-[var(--color-text-secondary)]" title={event.camera}>
          {event.camera}
          {event.zone ? ` · ${event.zone}` : ''}
        </p>
        {event.description ? (
          <p className="truncate text-xs text-[var(--color-text-muted)] italic">{event.description}</p>
        ) : null}
      </div>

      <span className="flex flex-shrink-0 items-center pr-3 font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">
        {timeHMS(event.t_start)}
      </span>
    </button>
  )
}
