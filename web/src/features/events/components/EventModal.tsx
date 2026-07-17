import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime, eventLabel, severityColor } from '@/shared/lib/format'
import { AlertTriangle, Check, eventIcon, Users, X } from '@/shared/ui/icons'
import type { EventItem } from '@/shared/api/types'
import { useFeedback } from '../api/eventsApi'

export function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const photo = useAuthedMedia(event.photo_url)
  const clip = useAuthedMedia(event.clip_url)
  const feedback = useFeedback()
  const [done, setDone] = useState<string | null>(null)
  const Icon = eventIcon[event.type]
  const color = severityColor[event.severity]

  function send(verdict: 'false_positive' | 'confirmed') {
    feedback.mutate({ id: event.id, verdict })
    setDone(t('events.marked'))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ color, background: 'var(--color-surface-2)' }}
            >
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-medium">{eventLabel(event.type, i18n.language)}</p>
              <p className="truncate text-sm text-[var(--color-muted)]" title={event.camera}>
                {event.camera}
                {event.zone ? ` · ${event.zone}` : ''} · {dateTime(event.t_start)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {clip ? (
            <video src={clip} controls className="w-full rounded-lg bg-black" />
          ) : photo ? (
            <img src={photo} alt="" className="w-full rounded-lg" />
          ) : (
            <div className="aspect-video animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          )}
          {event.description && (
            <p className="rounded-lg bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-text)]">
              {event.description}
            </p>
          )}
          {event.people_in_zone && event.people_in_zone > 1 && (
            <p className="flex items-center gap-1.5 text-sm text-[var(--color-warning)]">
              <Users size={15} />
              {t('events.people')}: {event.people_in_zone}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {done ? (
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-ok)]">
                <Check size={16} /> {done}
              </span>
            ) : (
              <>
                <Button variant="danger" onClick={() => send('false_positive')}>
                  <AlertTriangle size={15} /> {t('events.false')}
                </Button>
                <Button variant="ok" onClick={() => send('confirmed')}>
                  <Check size={15} /> {t('events.ok')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
