import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, PageHeader, Select, Skeleton } from '@/shared/ui'
import { Pagination } from '@/shared/ui/pagination'
import { FileDown } from '@/shared/ui/icons'
import { fetchAuthedBlob } from '@/shared/api/client'
import { eventLabel, type EventType } from '@/shared/lib/format'
import type { EventOut, Severity } from '@/shared/api/types'
import { EVENTS_PER_PAGE, useEvents, type EventFilters } from '../api/eventsApi'
import { EventCard } from '../components/EventCard'
import { EventModal } from '../components/EventModal'

// Скачивание PDF-отчёта — авторизованный blob, т.к. эндпоинт требует Bearer
async function downloadReport(filters: EventFilters) {
  try {
    const p = new URLSearchParams({ hours: String(filters.hours) })
    if (filters.camera_id) p.set('camera_id', filters.camera_id)
    if (filters.severity) p.set('severity', filters.severity)
    const url = await fetchAuthedBlob(`/api/v1/events/report.pdf?${p.toString()}`)
    const a = document.createElement('a')
    a.href = url
    a.download = 'pragmata-report.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    console.error('downloadReport failed', err)
  }
}

const TYPES: EventType[] = [
  'zone_intrusion',
  'loitering',
  'after_hours_presence',
  'person_entered',
  'person_exited',
  'camera_offline',
  'watchlist_match',
  'weapon_detected',
  'vehicle_seen',
]
const SEVERITIES: { value: Severity; key: string }[] = [
  { value: 'alert', key: 'events.sevAlert' },
  { value: 'warning', key: 'events.sevWarning' },
  { value: 'info', key: 'events.sevInfo' },
]

export function EventsPage() {
  const { t, i18n } = useTranslation()
  const [sp, setSearchParams] = useSearchParams()
  const [selected, setSelected] = useState<EventOut | null>(null)

  const n = Number(sp.get('hours'))
  const hours = Number.isFinite(n) && n > 0 ? n : 24
  const type = sp.get('type') ?? ''
  const severity = sp.get('severity') ?? ''
  const page = Math.max(1, Number(sp.get('page')) || 1)

  // Фильтры живут в URL — переживают навигацию/назад-вперёд (replace, чтобы не засорять историю).
  // Смена фильтра сбрасывает страницу на первую.
  function setParam(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  function setPage(p: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (p > 1) next.set('page', String(p))
        else next.delete('page')
        return next
      },
      { replace: true },
    )
    window.scrollTo({ top: 0 })
  }

  const lang = (['ru', 'uz', 'en'].includes(i18n.language) ? i18n.language : 'uz') as 'ru' | 'uz' | 'en'
  const filters: EventFilters = {
    hours,
    camera_id: sp.get('camera_id') ?? undefined,
    type: type || undefined,
    severity: severity || undefined,
  }
  const { data, isLoading, isError, refetch } = useEvents(filters, page)
  const items = data?.items ?? []
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / EVENTS_PER_PAGE))

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('events.title')}
        subtitle={t('events.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={hours} onChange={(v) => setParam('hours', v)}>
              <option value={1}>{t('events.h1')}</option>
              <option value={24}>{t('events.h24')}</option>
              <option value={168}>{t('events.h168')}</option>
            </Select>
            <Select value={type} onChange={(v) => setParam('type', v)}>
              <option value="">{t('events.type')}: {t('events.all')}</option>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {eventLabel(ty, lang)}
                </option>
              ))}
            </Select>
            <Select value={severity} onChange={(v) => setParam('severity', v)}>
              <option value="">{t('events.severity')}: {t('events.all')}</option>
              {SEVERITIES.map((sv) => (
                <option key={sv.value} value={sv.value}>
                  {t(sv.key)}
                </option>
              ))}
            </Select>
            <Button variant="secondary" size="sm" onClick={() => void downloadReport(filters)}>
              <FileDown size={16} /> PDF
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState text={t('common.noConnection')} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState text={t('events.empty')} />
      ) : (
        <div className="space-y-2">
          {items.map((ev) => (
            <EventCard key={ev.id} event={ev} onClick={() => setSelected(ev)} />
          ))}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {selected && <EventModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
