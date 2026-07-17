import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { dateTime, eventIcon } from '@/shared/lib/format'
import type { EventItem } from '@/shared/api/types'
import { useFeedback } from '../api/eventsApi'

export function EventModal({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(event.photo_url)
  const clip = useAuthedMedia(event.clip_url)
  const feedback = useFeedback()
  const [done, setDone] = useState<string | null>(null)

  function send(verdict: 'false_positive' | 'confirmed') {
    feedback.mutate({ id: event.id, verdict })
    setDone(t('events.marked'))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] p-4">
          <div className="min-w-0">
            <p className="font-medium">
              {eventIcon[event.type]} {event.type}
            </p>
            <p className="truncate text-sm text-[var(--color-muted)]" title={event.camera}>
              {event.camera}
              {event.zone ? ` · ${event.zone}` : ''} · {dateTime(event.t_start)}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)]">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          {clip ? (
            <video src={clip} controls className="w-full rounded-md bg-black" />
          ) : photo ? (
            <img src={photo} alt="" className="w-full rounded-md" />
          ) : (
            <div className="aspect-video animate-pulse rounded-md bg-[var(--color-surface-2)]" />
          )}
          {event.description && (
            <p className="rounded-md bg-[var(--color-surface-2)] p-3 text-sm">
              🧠 {event.description}
            </p>
          )}
          {event.people_in_zone && event.people_in_zone > 1 && (
            <p className="text-sm text-[var(--color-muted)]">
              {t('events.people')}: {event.people_in_zone}
            </p>
          )}
          <div className="flex gap-2">
            {done ? (
              <span className="text-sm text-[var(--color-ok)]">✅ {done}</span>
            ) : (
              <>
                <Button variant="danger" onClick={() => send('false_positive')}>
                  ⚠️ {t('events.false')}
                </Button>
                <Button variant="ok" onClick={() => send('confirmed')}>
                  ✅ {t('events.ok')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
