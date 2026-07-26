import { useState } from 'react'
import { AppPage } from '@/shared/ui/layout/AppPage'
import {
  Card,
  EmptyState,
  ResponsiveTable,
  StatusBadge,
  Switch,
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from '@/shared/ui'
import { Download, Pencil, ScrollText } from '@/shared/ui/icons'
import { useAudit, type AuditRow } from '@/api/queries'

function tone(code: number): 'success' | 'warning' | 'error' {
  if (code < 300) return 'success'
  if (code === 401 || code === 403) return 'warning'
  return 'error'
}

export function AuditPage() {
  const [onlyWrites, setOnlyWrites] = useState(false)
  const q = useAudit(onlyWrites)
  const rows: AuditRow[] = q.data ?? []

  return (
    <AppPage
      title="Журнал"
      description="Кто, что и когда менял или выгружал"
      toolbar={
        <Card className="flex items-center gap-2 px-3 py-1.5">
          <Switch checked={onlyWrites} onCheckedChange={setOnlyWrites} id="ow" />
          <label htmlFor="ow" className="text-[13px] font-medium text-[var(--color-text-secondary)]">
            только изменения
          </label>
        </Card>
      }
    >
      <TableCard>
        {q.isLoading ? (
          <TableSkeleton columns={6} />
        ) : q.isError ? (
          <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<ScrollText size={48} />} title="Журнал пуст" />
        ) : (
          <ResponsiveTable mode="scroll" scrollMinWidth="820px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>ВРЕМЯ</TableHead>
                  <TableHead>КТО</TableHead>
                  <TableHead>ДЕЙСТВИЕ</TableHead>
                  <TableHead>ИТОГ</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => {
                  const d = new Date(e.ts)
                  const isGet = e.method === 'GET'
                  return (
                    <TableRow key={e.id}>
                      <TableCell className={isGet ? 'text-[var(--color-violet-500)]' : 'text-[var(--color-brand-500)]'}>
                        {isGet ? <Download size={15} /> : <Pencil size={15} />}
                      </TableCell>
                      <TableCell className="tabular-nums text-[var(--color-text-muted)]">
                        {d.toLocaleDateString()} {d.toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-semibold text-[var(--color-text-primary)]">{e.actor}</TableCell>
                      <TableCell className="text-[var(--color-text-secondary)]">
                        <span className="font-mono text-[12px]">{e.method}</span> {e.path}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={tone(e.status_code)}>{e.status_code}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-[var(--color-text-muted)]">{e.ip}</TableCell>
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
