import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Spinner } from '@/shared/ui'
import type { EventItem, EventType, Severity } from '@/shared/api/types'
import { useEvents, type EventFilters } from '../api/eventsApi'
import { EventCard } from '../components/EventCard'
import { EventModal } from '../components/EventModal'

const TYPES: EventType[] = [
  'zone_intrusion',
  'loitering',
  'after_hours_presence',
  'person_entered',
  'person_exited',
  'camera_offline',
]
const SEVERITIES: Severity[] = ['alert', 'warning', 'info']

export function EventsPage() {
  const { t } = useTranslation()
  const [sp] = useSearchParams()
  const [hours, setHours] = useState(24)
  const [type, setType] = useState('')
  const [severity, setSeverity] = useState('')
  const [selected, setSelected] = useState<EventItem | null>(null)

  const filters: EventFilters = {
    hours,
    camera_id: sp.get('camera_id') ?? undefined,
    type: type || undefined,
    severity: severity || undefined,
  }
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEvents(filters)

  const items = data?.pages.flatMap((p) => p.items) ?? []
  const selectCls =
    'rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={selectCls}>
          <option value={1}>{t('events.h1')}</option>
          <option value={24}>{t('events.h24')}</option>
          <option value={168}>{t('events.h168')}</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
          <option value="">{t('events.type')}: {t('events.all')}</option>
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectCls}>
          <option value="">{t('events.severity')}: {t('events.all')}</option>
          {SEVERITIES.map((sv) => (
            <option key={sv} value={sv}>
              {sv}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState title={t('common.noConnection')} />
      ) : items.length === 0 ? (
        <EmptyState title={t('events.empty')} />
      ) : (
        <div className="space-y-2">
          {items.map((ev) => (
            <EventCard key={ev.id} event={ev} onClick={() => setSelected(ev)} />
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                {t('events.more')}
              </Button>
            </div>
          )}
        </div>
      )}

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
