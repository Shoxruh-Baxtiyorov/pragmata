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
import { User } from '@/shared/ui/icons'
import { usePersons } from '@/api/queries'

const CAT: Record<string, string> = {
  employee: 'сотрудник',
  visitor: 'гость',
  contractor: 'подрядчик',
  watchlist: 'под наблюдением',
  banned: 'запрещён',
  other: 'прочее',
}

export function PersonsPage() {
  const q = usePersons()
  const persons = q.data ?? []

  return (
    <AppPage title="Люди" description="Реестр лиц: сотрудники, гости, наблюдение">
      <TableCard>
        {q.isLoading ? (
          <TableSkeleton columns={4} />
        ) : q.isError ? (
          <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
        ) : persons.length === 0 ? (
          <EmptyState icon={<User size={48} />} title="Реестр пуст" />
        ) : (
          <ResponsiveTable mode="scroll" scrollMinWidth="640px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ИМЯ</TableHead>
                  <TableHead>КАТЕГОРИЯ</TableHead>
                  <TableHead>НАБЛЮДЕНИЕ</TableHead>
                  <TableHead className="text-right">ФОТО</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {persons.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-[var(--color-text-primary)]">
                      {p.name}
                      {p.position && (
                        <span className="ml-2 text-[12px] font-normal text-[var(--color-text-muted)]">
                          {p.position}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[var(--color-text-secondary)]">
                      {CAT[p.category] ?? p.category}
                    </TableCell>
                    <TableCell>
                      {p.watch ? <StatusBadge tone="error">наблюдение</StatusBadge> : <span className="text-[var(--color-text-muted)]">—</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.photo_count}</TableCell>
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
