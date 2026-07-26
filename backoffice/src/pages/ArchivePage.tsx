import { useQuery } from '@tanstack/react-query'
import { AppPage } from '@/shared/ui/layout/AppPage'
import {
  EmptyState,
  ResponsiveTable,
  StatusBadge,
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/shared/ui'
import { Archive } from '@/shared/ui/icons'
import { api } from '@/api/client'

interface Job {
  id: string
  filename: string
  camera_id: string
  recorded_at: string
  status: string
  progress: number
  events_found: number
  error: string | null
}

const STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'error' }> = {
  pending: { label: 'в очереди', tone: 'neutral' },
  running: { label: 'разбирается', tone: 'info' },
  done: { label: 'готово', tone: 'success' },
  error: { label: 'ошибка', tone: 'error' },
}

export function ArchivePage() {
  const q = useQuery({
    queryKey: ['archive-jobs'],
    queryFn: () => api.get<Job[]>('/api/v1/archive/jobs'),
    refetchInterval: 4000,
  })
  const jobs = q.data ?? []

  return (
    <AppPage title="Архив" description="Ретро-анализ старых записей (форензика)">
      <TableCard>
        {q.isLoading ? (
          <TableSkeleton columns={5} />
        ) : q.isError ? (
          <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
        ) : jobs.length === 0 ? (
          <EmptyState icon={<Archive size={48} />} title="Задач разбора нет" description="Разбор записи запускается из операторского интерфейса." />
        ) : (
          <ResponsiveTable mode="scroll" scrollMinWidth="720px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ЗАПИСЬ</TableHead>
                  <TableHead>КАМЕРА</TableHead>
                  <TableHead>СТАТУС</TableHead>
                  <TableHead className="text-right">СОБЫТИЙ</TableHead>
                  <TableHead className="text-right">ПРОГРЕСС</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => {
                  const st = STATUS[j.status] ?? STATUS.pending
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="font-semibold text-[var(--color-text-primary)]">
                        {j.filename}
                        <div className="text-[12px] font-normal text-[var(--color-text-muted)]">
                          {new Date(j.recorded_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-[var(--color-text-secondary)]">{j.camera_id}</TableCell>
                      <TableCell>
                        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{j.events_found}</TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--color-text-muted)]">
                        {Math.round(j.progress * 100)}%
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ResponsiveTable>
        )}
      </TableCard>
    </AppPage>
  )
}
