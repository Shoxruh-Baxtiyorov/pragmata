import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { useToast } from '@/shared/ui/toast'
import { dateTime, eventLabel, severityColor } from '@/shared/lib/format'
import { AlertTriangle, Check, eventIcon, Users, X } from '@/shared/ui/icons'
import type { EventItem } from '@/shared/api/types'
import { useFeedback } from '../api/eventsApi'

export function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const photo = useAuthedMedia(event.photo_url)
  const clip = useAuthedMedia(event.clip_url)
  const feedback = useFeedback()
  const toast = useToast()
  const [done, setDone] = useState(false)
  const Icon = eventIcon[event.type]
  const color = severityColor[event.severity]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function send(verdict: 'false_positive' | 'confirmed') {
    feedback.mutate({ id: event.id, verdict })
    setDone(true)
    toast(t('events.marked'), 'ok')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-neutral-900)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[var(--radius-xl)] border border-[var(--color-border-soft)] bg-white shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border-soft)] p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]"
              style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
            >
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="font-heading font-bold">{eventLabel(event.type, i18n.language)}</p>
              <p className="truncate text-sm text-[var(--color-text-muted)]" title={event.camera}>
                {event.camera}
                {event.zone ? ` · ${event.zone}` : ''} · {dateTime(event.t_start)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {clip ? (
            <video src={clip} controls className="w-full rounded-[var(--radius-lg)] bg-black" />
          ) : photo ? (
            <img src={photo} alt="" className="w-full rounded-[var(--radius-lg)]" />
          ) : (
            <div className="aspect-video animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-bg-muted)]" />
          )}
          {event.description && (
            <p className="rounded-[var(--radius-lg)] bg-[var(--color-bg-muted)] p-3 text-sm text-[var(--color-text-secondary)]">
              {event.description}
            </p>
          )}
          {event.people_in_zone && event.people_in_zone > 1 && (
            <p className="flex items-center gap-1.5 text-sm text-[var(--color-warning-text)]">
              <Users size={15} />
              {t('events.people')}: {event.people_in_zone}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {done ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-success-text)]">
                <Check size={16} /> {t('events.marked')}
              </span>
            ) : (
              <>
                <Button variant="destructive" size="sm" onClick={() => send('false_positive')}>
                  <AlertTriangle size={15} /> {t('events.false')}
                </Button>
                <Button variant="success" size="sm" onClick={() => send('confirmed')}>
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
