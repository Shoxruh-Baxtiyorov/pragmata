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
import { Building2 } from '@/shared/ui/icons'
import { useSites } from '@/api/queries'

const TARIFF: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' }> = {
  basic: { label: "Ko'z (Basic)", tone: 'neutral' },
  pro: { label: 'Nazorat (Pro)', tone: 'info' },
  enterprise: { label: 'Qalqon (Enterprise)', tone: 'success' },
}

export function TenantsPage() {
  const q = useSites()
  const sites = q.data ?? []

  return (
    <AppPage
      title="Организации"
      description="Клиенты платформы — каждый видит только свои камеры и события"
    >
      <TableCard>
        {q.isLoading ? (
          <TableSkeleton columns={4} />
        ) : q.isError ? (
          <EmptyState
            variant="error"
            title="Не удалось загрузить организации"
            action={{ label: 'Повторить', onClick: () => void q.refetch() }}
          />
        ) : sites.length === 0 ? (
          <EmptyState icon={<Building2 size={48} />} title="Организаций нет" />
        ) : (
          <ResponsiveTable mode="scroll" scrollMinWidth="640px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>НАЗВАНИЕ</TableHead>
                  <TableHead>ТАРИФ</TableHead>
                  <TableHead className="text-right">КАМЕР</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((s) => {
                  const t = TARIFF[s.tariff] ?? TARIFF.basic
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-[var(--color-text-muted)]">{s.id}</TableCell>
                      <TableCell className="font-semibold text-[var(--color-text-primary)]">
                        {s.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.cameras}</TableCell>
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
