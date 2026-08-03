import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Skeleton } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime, eventLabel, severityColor, type EventType } from '@/shared/lib/format'
import { AlertTriangle, Check, eventIcon, ShieldAlert, Users } from '@/shared/ui/icons'
import type { EventOut, Severity } from '@/shared/api/types'
import { useFeedback } from '../api/eventsApi'

export function EventModal({ event, onClose }: { event: EventOut; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const photo = useAuthedMedia(event.photo_url)
  const clip = useAuthedMedia(event.clip_url)
  const feedback = useFeedback()
  const [done, setDone] = useState(false)
  const lang = (['ru', 'uz', 'en'].includes(i18n.language) ? i18n.language : 'uz') as 'ru' | 'uz' | 'en'
  const Icon = eventIcon[event.type as EventType] ?? ShieldAlert
  const color = severityColor[event.severity as Severity]

  function send(verdict: 'false_positive' | 'confirmed') {
    feedback.mutate({ id: event.id, verdict })
    setDone(true)
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between gap-2 pr-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-lg)]"
            style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
          >
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-[var(--color-text-primary)]">
              {eventLabel(event.type, lang)}
            </p>
            <p className="truncate text-xs text-[var(--color-text-secondary)]" title={event.camera}>
              {event.camera}
              {event.zone ? ` · ${event.zone}` : ''} · {dateTime(event.t_start)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {clip ? (
          <video src={clip} controls className="w-full rounded-[var(--radius-lg)] bg-black" />
        ) : photo ? (
          <img src={photo} alt="" className="w-full rounded-[var(--radius-lg)]" />
        ) : event.photo_url || event.clip_url ? (
          <Skeleton className="aspect-video w-full" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-bg-muted)]">
            <Icon size={32} className="text-[var(--color-text-secondary)]" />
          </div>
        )}
        {event.description ? (
          <p className="rounded-[var(--radius-lg)] bg-[var(--color-bg-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
            {event.description}
          </p>
        ) : null}
        {/* status-*-text вместо *-500: у жёлтого/зелёного 500 нет контраста на белом */}
        {event.people_in_zone && event.people_in_zone > 1 ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-status-warning-text)]">
            <Users size={16} />
            {t('events.people')}: {event.people_in_zone}
          </p>
        ) : null}
        <div className="flex gap-2 pt-1">
          {done ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-status-success-text)]">
              <Check size={16} /> {t('events.marked')}
            </span>
          ) : (
            <>
              <Button variant="destructive" size="sm" onClick={() => send('false_positive')}>
                <AlertTriangle size={16} /> {t('events.false')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => send('confirmed')}>
                <Check size={16} /> {t('events.ok')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
