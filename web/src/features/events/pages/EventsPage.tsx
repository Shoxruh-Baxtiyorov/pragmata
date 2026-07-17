import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, PageHeader, Select, Skeleton } from '@/shared/ui'
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
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvents(filters)
  const items = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <>
      <PageHeader
        title={t('events.title')}
        subtitle={t('events.subtitle')}
        actions={
          <>
            <Select value={hours} onChange={(v) => setHours(Number(v))}>
              <option value={1}>{t('events.h1')}</option>
              <option value={24}>{t('events.h24')}</option>
              <option value={168}>{t('events.h168')}</option>
            </Select>
            <Select value={type} onChange={setType}>
              <option value="">{t('events.type')}: {t('events.all')}</option>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {ty}
                </option>
              ))}
            </Select>
            <Select value={severity} onChange={setSeverity}>
              <option value="">{t('events.severity')}: {t('events.all')}</option>
              {SEVERITIES.map((sv) => (
                <option key={sv} value={sv}>
                  {sv}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
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
              <Button variant="outline" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                {t('events.more')}
              </Button>
            </div>
          )}
        </div>
      )}

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
