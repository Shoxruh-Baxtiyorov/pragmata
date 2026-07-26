import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AppPage } from '@/shared/ui/layout/AppPage'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Input,
  Label,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'
import { Building2, Pencil, Plus, Trash2 } from '@/shared/ui/icons'
import { ApiError } from '@/api/client'
import {
  useCreateSite,
  useDeleteSite,
  usePatchSite,
  usePlans,
  useSites,
  type SiteRow,
} from '@/api/queries'

const TONE: Record<string, 'neutral' | 'info' | 'success'> = {
  basic: 'neutral',
  pro: 'info',
  enterprise: 'success',
}

function SiteDialog({
  open,
  onOpenChange,
  edit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  edit: SiteRow | null
}) {
  const create = useCreateSite()
  const patch = usePatchSite()
  const plans = usePlans()
  const [name, setName] = useState(edit?.name ?? '')
  const [tariff, setTariff] = useState(edit?.tariff ?? 'basic')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const done = (msg: string) => () => {
      toast.success(msg)
      onOpenChange(false)
    }
    const fail = (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Ошибка')
    if (edit) {
      patch
        .mutateAsync({ id: edit.id, patch: { name: name.trim(), tariff } })
        .then(done('Организация обновлена'))
        .catch(fail)
    } else {
      create
        .mutateAsync({ name: name.trim(), tariff })
        .then(done('Организация создана'))
        .catch(fail)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? 'Организация' : 'Новая организация'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sn">Название</Label>
            <Input id="sn" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="st">Тариф</Label>
            <select
              id="st"
              value={tariff}
              onChange={(e) => setTariff(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
            >
              {(plans.data ?? []).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending || patch.isPending}>
              {edit ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function TenantsPage() {
  const q = useSites()
  const del = useDeleteSite()
  const [dialog, setDialog] = useState<{ open: boolean; edit: SiteRow | null }>({ open: false, edit: null })
  const sites = q.data ?? []

  const remove = (s: SiteRow) => {
    if (!window.confirm(`Удалить организацию «${s.name}»?`)) return
    del
      .mutateAsync(s.id)
      .then(() => toast.success('Организация удалена'))
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Ошибка'))
  }

  return (
    <AppPage
      title="Организации"
      description="Клиенты платформы — каждый видит только свои камеры и события"
      toolbar={
        <Button onClick={() => setDialog({ open: true, edit: null })}>
          <Plus size={16} /> Организация
        </Button>
      }
    >
      <TableCard>
        {q.isLoading ? (
          <TableSkeleton columns={4} />
        ) : q.isError ? (
          <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
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
                  <TableHead className="text-right">ДЕЙСТВИЯ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-[var(--color-text-muted)]">{s.id}</TableCell>
                    <TableCell className="font-semibold text-[var(--color-text-primary)]">{s.name}</TableCell>
                    <TableCell>
                      <StatusBadge tone={TONE[s.tariff] ?? 'neutral'}>{s.tariff}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.cameras}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <IconButton aria-label="Правка" onClick={() => setDialog({ open: true, edit: s })}>
                              <Pencil size={16} />
                            </IconButton>
                          </TooltipTrigger>
                          <TooltipContent>Правка</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <IconButton aria-label="Удалить" disabled={del.isPending} onClick={() => remove(s)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </TooltipTrigger>
                          <TooltipContent>Удалить</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        )}
      </TableCard>
      <SiteDialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))} edit={dialog.edit} />
    </AppPage>
  )
}
