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
import { Camera } from '@/shared/ui/icons'
import { useCameras } from '@/api/queries'

export function CamerasPage() {
  const q = useCameras()
  const cams = q.data ?? []

  return (
    <AppPage title="Камеры" description="Все источники видео на платформе">
      <TableCard>
        {q.isLoading ? (
          <TableSkeleton columns={4} />
        ) : q.isError ? (
          <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
        ) : cams.length === 0 ? (
          <EmptyState icon={<Camera size={48} />} title="Камер нет" />
        ) : (
          <ResponsiveTable mode="scroll" scrollMinWidth="640px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>НАЗВАНИЕ</TableHead>
                  <TableHead>СТАТУС</TableHead>
                  <TableHead className="text-right">ЗОН</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cams.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-[var(--color-text-muted)]">{c.id}</TableCell>
                    <TableCell className="font-semibold text-[var(--color-text-primary)]">{c.name}</TableCell>
                    <TableCell>
                      {!c.enabled ? (
                        <StatusBadge tone="neutral">выключена</StatusBadge>
                      ) : c.online ? (
                        <StatusBadge tone="success">онлайн</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">нет сигнала</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.zones.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        )}
      </TableCard>
    </AppPage>
  )
}
