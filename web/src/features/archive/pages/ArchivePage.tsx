import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { dateTime } from '@/shared/lib/format'
import { Database, Search } from '@/shared/ui/icons'
import type { ArchiveJob } from '@/shared/api/types'
import { EventCard } from '@/features/events/components/EventCard'
import {
  useAnalyzeArchive,
  useArchiveEvents,
  useArchiveJobs,
  useCamerasList,
} from '../api/archiveApi'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'error'
const STATUS_TONE: Record<ArchiveJob['status'], Tone> = {
  pending: 'neutral',
  running: 'brand',
  done: 'success',
  error: 'error',
}

function AnalyzeForm() {
  const { t } = useTranslation()
  const cams = useCamerasList()
  const analyze = useAnalyzeArchive()
  const [file, setFile] = useState<File | null>(null)
  const [recordedAt, setRecordedAt] = useState('')
  const [cameraId, setCameraId] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!file || !recordedAt || !cameraId) return
    analyze.mutate(
      { file, recorded_at: recordedAt, camera_id: cameraId },
      {
        onSuccess: () => {
          setFile(null)
          setRecordedAt('')
        },
      },
    )
  }

  return (
    <Card className="mb-5 p-5">
      <h2 className="mb-1 text-body font-bold">{t('archive.newTitle')}</h2>
      <p className="mb-4 text-label text-text-secondary">{t('archive.newHint')}</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-label text-text-secondary">{t('archive.file')}</span>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-body text-text-secondary file:mr-3 file:rounded-button file:border-0 file:bg-brand-10 file:px-3 file:py-1.5 file:text-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label text-text-secondary">{t('archive.recordedAt')}</span>
            <Input
              type="datetime-local"
              className="w-56"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label text-text-secondary">{t('archive.camera')}</span>
            <Select value={cameraId} onChange={setCameraId}>
              <option value="">—</option>
              {(cams.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <Button
            type="submit"
            loading={analyze.isPending}
            disabled={!file || !recordedAt || !cameraId}
          >
            <Search size={16} /> {t('archive.analyze')}
          </Button>
        </div>
        {analyze.isError && (
          <p className="text-label text-error">
            {analyze.error instanceof ApiError ? analyze.error.message : t('common.noConnection')}
          </p>
        )}
      </form>
    </Card>
  )
}

function ArchiveEvents({ cameraId }: { cameraId: string }) {
  const { t } = useTranslation()
  const { data, isLoading } = useArchiveEvents(cameraId)
  if (isLoading) return <Spinner />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState text={t('archive.noEvents')} />
  return (
    <div className="space-y-2 pt-2">
      {items.map((ev) => (
        <EventCard key={ev.id} event={ev} onClick={() => {}} />
      ))}
    </div>
  )
}

function JobRow({ job }: { job: ArchiveJob }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border-default py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <Database size={18} className="text-text-secondary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold" title={job.filename}>
            {job.filename}
          </p>
          <p className="text-label text-text-secondary">
            {job.camera_id} · {dateTime(job.recorded_at)}
          </p>
        </div>
        <Badge tone={STATUS_TONE[job.status]}>{t(`archive.status.${job.status}`)}</Badge>
        {job.status === 'done' && (
          <>
            <span className="text-label tabular-nums text-text-secondary">
              {t('archive.foundN', { count: job.events_found })}
            </span>
            {job.events_found > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
                {open ? t('common.close') : t('archive.show')}
              </Button>
            )}
          </>
        )}
      </div>

      {job.status === 'running' && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-bg-secondary">
          <div
            className="h-full rounded-pill bg-brand transition-all"
            style={{ width: `${Math.round(job.progress * 100)}%` }}
          />
        </div>
      )}
      {job.error && <p className="mt-1 text-label text-error">{job.error}</p>}
      {open && <ArchiveEvents cameraId={job.camera_id} />}
    </div>
  )
}

export function ArchivePage() {
  const { t } = useTranslation()
  const jobs = useArchiveJobs()

  return (
    <>
      <PageHeader title={t('archive.title')} subtitle={t('archive.subtitle')} />
      <AnalyzeForm />
      {jobs.isLoading ? (
        <Spinner />
      ) : !jobs.data || jobs.data.length === 0 ? (
        <EmptyState text={t('archive.empty')} />
      ) : (
        <Card className="p-4">
          {jobs.data.map((j) => (
            <JobRow key={j.id} job={j} />
          ))}
        </Card>
      )}
    </>
  )
}
