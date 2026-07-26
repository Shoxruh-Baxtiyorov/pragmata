import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AppPage } from '@/shared/ui/layout/AppPage'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Input,
  Label,
  Skeleton,
  StatusBadge,
} from '@/shared/ui'
import { Check, Pencil } from '@/shared/ui/icons'
import { ApiError } from '@/api/client'
import { usePatchPlan, usePlans, useSites, type PlanRow } from '@/api/queries'

const TONE: Record<string, 'neutral' | 'info' | 'success'> = {
  basic: 'neutral',
  pro: 'info',
  enterprise: 'success',
}

function EditDialog({ plan, onClose }: { plan: PlanRow; onClose: () => void }) {
  const patch = usePatchPlan()
  const [priceNote, setPriceNote] = useState(plan.price_note)
  const [info, setInfo] = useState(String(plan.retention_info_days))
  const [alert, setAlert] = useState(String(plan.retention_alert_days))
  const [features, setFeatures] = useState(plan.features.join('\n'))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    patch
      .mutateAsync({
        key: plan.key,
        patch: {
          price_note: priceNote,
          retention_info_days: Number(info),
          retention_alert_days: Number(alert),
          features: features.split('\n').map((f) => f.trim()).filter(Boolean),
        },
      })
      .then(() => {
        toast.success('Тариф обновлён')
        onClose()
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Ошибка'))
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pp">Цена (текст)</Label>
            <Input id="pp" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pi">info (дней)</Label>
              <Input id="pi" type="number" min="1" value={info} onChange={(e) => setInfo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pa">alert (дней)</Label>
              <Input id="pa" type="number" min="1" value={alert} onChange={(e) => setAlert(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf">Фичи (по строке на пункт)</Label>
            <textarea
              id="pf"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={6}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2 text-sm"
            />
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={patch.isPending}>
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PlansPage() {
  const q = usePlans()
  const sites = useSites()
  const [editing, setEditing] = useState<PlanRow | null>(null)

  const counts = (sites.data ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.tariff] = (acc[s.tariff] ?? 0) + 1
    return acc
  }, {})

  return (
    <AppPage title="Тарифы" description="Каталог планов — организации выбирают из этого списка">
      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : q.isError || !q.data ? (
        <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {q.data.map((p) => (
            <Card key={p.key} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[17px] font-extrabold text-[var(--color-text-primary)]">{p.name}</div>
                  <div className="mt-0.5 text-[15px] font-bold text-[var(--color-brand-500)]">{p.price_note}</div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge tone={TONE[p.key] ?? 'neutral'}>{counts[p.key] ?? 0} орг.</StatusBadge>
                  <IconButton aria-label="Правка" onClick={() => setEditing(p)}>
                    <Pencil size={15} />
                  </IconButton>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[var(--color-text-secondary)]">
                    <Check size={15} className="mt-0.5 shrink-0 text-[var(--color-success-500)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto border-t border-[var(--color-border-soft)] pt-3 text-[12px] text-[var(--color-text-muted)]">
                хранение: info {p.retention_info_days} дн · alert {p.retention_alert_days} дн
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && <EditDialog plan={editing} onClose={() => setEditing(null)} />}
    </AppPage>
  )
}
