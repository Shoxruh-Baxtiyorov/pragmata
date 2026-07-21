import { useState } from 'react'
import { Download, PencilLine } from 'lucide-react'
import { api, type AuditEntry } from '../api'
import { useFetch } from '../hooks'
import { Badge, Card } from '../ui'
import { PageState } from './state'

// GET в журнале — это выгрузка доказательств наружу (медиа/PDF/снапшот),
// поэтому визуально отделяем «скачал» от «изменил».
function kind(e: AuditEntry) {
  return e.method === 'GET' ? 'download' : 'write'
}

function statusTone(code: number) {
  if (code < 300) return 'success' as const
  if (code === 401 || code === 403) return 'warning' as const
  return 'error' as const
}

function Row({ e }: { e: AuditEntry }) {
  const isDownload = kind(e) === 'download'
  const d = new Date(e.ts)
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border-default py-2.5 last:border-0">
      <span className={isDownload ? 'text-accent' : 'text-brand'} title={isDownload ? 'выгрузка' : 'изменение'}>
        {isDownload ? <Download size={16} /> : <PencilLine size={16} />}
      </span>
      <span className="w-32 shrink-0 text-caption tabular-nums text-text-muted">
        {d.toLocaleDateString()} {d.toLocaleTimeString()}
      </span>
      <span className="w-28 shrink-0 truncate text-label font-semibold" title={e.actor}>
        {e.actor}
      </span>
      <span className="w-16 shrink-0 text-caption font-semibold text-text-secondary">
        {e.method}
      </span>
      <span className="min-w-0 flex-1 truncate text-label text-text-secondary" title={e.path}>
        {e.path}
      </span>
      <Badge tone={statusTone(e.status_code)}>{e.status_code}</Badge>
      <span className="w-28 shrink-0 truncate text-caption text-text-placeholder">{e.ip}</span>
    </div>
  )
}

export function Audit() {
  const [onlyWrites, setOnlyWrites] = useState(false)
  const q = useFetch<AuditEntry[]>(
    () => api.get(`/api/v1/backoffice/audit?limit=200&only_writes=${onlyWrites}`),
    [onlyWrites],
  )

  return (
    <PageState loading={q.loading} error={q.error} reload={q.reload}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label text-text-secondary">
            Кто, что и когда менял или выгружал. Пишется на каждый изменяющий запрос —
            эндпоинт нельзя забыть зааудитить.
          </p>
          <label className="flex shrink-0 items-center gap-2 text-label font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand)]"
              checked={onlyWrites}
              onChange={(ev) => setOnlyWrites(ev.target.checked)}
            />
            только изменения
          </label>
        </div>
        {q.data && q.data.length === 0 ? (
          <Card className="p-8 text-center text-label text-text-secondary">Журнал пуст</Card>
        ) : (
          <Card className="p-4">{q.data?.map((e) => <Row key={e.id} e={e} />)}</Card>
        )}
      </div>
    </PageState>
  )
}
