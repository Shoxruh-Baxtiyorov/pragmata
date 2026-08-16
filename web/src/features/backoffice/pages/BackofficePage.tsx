import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  SkeletonGrid,
} from '@/shared/ui'
import { Plus, Trash2 } from '@/shared/ui/icons'
import { PERSON_CATEGORIES, type AnalyticsModule } from '@/shared/api/types'
import { useAnalyticsCatalog } from '@/features/analytics/api/analyticsApi'
import { useCanManage } from '@/features/auth'
import {
  type PlanRow,
  useAssignPlan,
  useBoPlans,
  useBoSites,
  useCreatePlan,
  useDeletePlan,
  useUpdatePlan,
} from '../api/backofficeApi'

// Разделы приложения (навигация) — гейтятся тарифом. Метки берём из nav.*
const FEATURE_KEYS: { key: string; label: string }[] = [
  { key: 'assistant', label: 'nav.assistant' },
  { key: 'journal', label: 'nav.journal' },
  { key: 'watchlist', label: 'nav.watchlist' },
  { key: 'heatmap', label: 'nav.heatmap' },
  { key: 'stats', label: 'nav.stats' },
  { key: 'search', label: 'nav.search' },
  { key: 'archive', label: 'nav.archive' },
  { key: 'turnstile', label: 'nav.turnstiles' },
]
const H2 = 'text-base font-extrabold tracking-tight text-[var(--color-text-primary)]'
const CAP = 'mb-1 text-xs font-bold text-[var(--color-text-secondary)]'

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 text-xs hover:bg-[var(--color-bg-muted)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 accent-[var(--color-brand-500)]"
      />
      <span className="text-[var(--color-text-primary)]">{label}</span>
    </label>
  )
}

// поле-подпись для мета-параметров подписки
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">{label}</span>
      {children}
    </label>
  )
}

// пусто/["*"] в тарифе = «всё» → в редакторе показываем все галочки
function seed(raw: string[] | undefined, all: string[]): Set<string> {
  if (raw === undefined || raw.includes('*')) return new Set(all)
  return new Set(raw)
}

function PlanEditor({ plan, modules }: { plan: PlanRow; modules: AnalyticsModule[] }) {
  const { t } = useTranslation()
  const save = useUpdatePlan()
  const del = useDeletePlan()
  const allMods = useMemo(() => modules.map((m) => m.key), [modules])

  const [name, setName] = useState(plan.name)
  const [price, setPrice] = useState(plan.price_note)
  const [retInfo, setRetInfo] = useState(plan.retention_info_days)
  const [retAlert, setRetAlert] = useState(plan.retention_alert_days)
  const [active, setActive] = useState(plan.active)
  const [mods, setMods] = useState(() => seed(plan.entitlements.modules, allMods))
  const [feats, setFeats] = useState(() => seed(plan.entitlements.features, FEATURE_KEYS.map((f) => f.key)))
  const [cats, setCats] = useState(() => seed(plan.entitlements.person_categories, [...PERSON_CATEGORIES]))
  const [confirmDel, setConfirmDel] = useState(false)

  const toggle = (set: Set<string>, upd: (s: Set<string>) => void, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    upd(next)
  }

  const submit = () =>
    save.mutate(
      {
        key: plan.key,
        patch: {
          name: name.trim() || plan.key,
          price_note: price,
          retention_info_days: retInfo,
          retention_alert_days: retAlert,
          active,
          entitlements: {
            modules: [...mods],
            features: [...feats],
            person_categories: [...cats],
          },
        },
      },
      { onSuccess: () => toast.success(t('bo.saved')), onError: () => toast.error(t('common.noConnection')) },
    )

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input className="w-52" value={name} onChange={(e) => setName(e.target.value)} />
          <Badge tone="neutral">{plan.key}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              checked={active}
              onChange={() => setActive((v) => !v)}
              className="size-4 accent-[var(--color-brand-500)]"
            />
            {t('bo.active')}
          </label>
          <Button size="sm" onClick={submit} loading={save.isPending}>
            {t('bo.save')}
          </Button>
          <Button size="sm" variant="ghost" title={t('bo.delete')} onClick={() => setConfirmDel(true)}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label={t('bo.price')}>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label={t('bo.retInfo')}>
          <Input
            type="number"
            value={String(retInfo)}
            onChange={(e) => setRetInfo(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
        <Field label={t('bo.retAlert')}>
          <Input
            type="number"
            value={String(retAlert)}
            onChange={(e) => setRetAlert(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
      </div>

      <div>
        <div className={CAP}>{t('bo.modules')}</div>
        <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
          {modules.map((m) => (
            <Check
              key={m.key}
              checked={mods.has(m.key)}
              onChange={() => toggle(mods, setMods, m.key)}
              label={t(`an.mod.${m.key}`, { defaultValue: m.name })}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className={CAP}>{t('bo.features')}</div>
          <div className="grid grid-cols-2 gap-x-4">
            {FEATURE_KEYS.map((f) => (
              <Check
                key={f.key}
                checked={feats.has(f.key)}
                onChange={() => toggle(feats, setFeats, f.key)}
                label={t(f.label)}
              />
            ))}
          </div>
        </div>
        <div>
          <div className={CAP}>{t('bo.categories')}</div>
          <div className="grid grid-cols-2 gap-x-4">
            {PERSON_CATEGORIES.map((c) => (
              <Check
                key={c}
                checked={cats.has(c)}
                onChange={() => toggle(cats, setCats, c)}
                label={t(`people.cat.${c}`)}
              />
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        title={t('bo.delete')}
        description={t('bo.confirmDelete', { name: plan.name })}
        confirmLabel={t('bo.delete')}
        busy={del.isPending}
        onConfirm={() => {
          del.mutate(plan.key, {
            onSuccess: () => toast.success(t('bo.planDeleted')),
            onError: () => toast.error(t('common.noConnection')),
          })
          setConfirmDel(false)
        }}
        onCancel={() => setConfirmDel(false)}
      />
    </Card>
  )
}

function CreatePlan() {
  const { t } = useTranslation()
  const create = useCreatePlan()
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [retInfo, setRetInfo] = useState(30)
  const [retAlert, setRetAlert] = useState(90)

  const slug = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const canCreate = slug.length > 0 && name.trim().length > 0

  const submit = () => {
    if (!canCreate) return
    create.mutate(
      {
        key: slug,
        body: {
          name: name.trim(),
          price_note: price,
          retention_info_days: retInfo,
          retention_alert_days: retAlert,
          active: true,
        },
      },
      {
        onSuccess: () => {
          toast.success(t('bo.planCreated'))
          setOpen(false)
          setKey('')
          setName('')
          setPrice('')
        },
        onError: () => toast.error(t('common.noConnection')),
      },
    )
  }

  if (!open) {
    return (
      <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
        <Plus size={16} /> {t('bo.newPlan')}
      </Button>
    )
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="text-sm font-bold text-[var(--color-text-primary)]">{t('bo.newPlan')}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('bo.planKey')}>
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="school" />
          <span className="text-[11px] text-[var(--color-text-subtle)]">{t('bo.keyHint')}</span>
        </Field>
        <Field label={t('bo.planName')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('bo.price')}>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('bo.retInfo')}>
            <Input
              type="number"
              value={String(retInfo)}
              onChange={(e) => setRetInfo(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
          <Field label={t('bo.retAlert')}>
            <Input
              type="number"
              value={String(retAlert)}
              onChange={(e) => setRetAlert(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} loading={create.isPending} disabled={!canCreate}>
          {t('bo.create')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t('common.close')}
        </Button>
      </div>
    </Card>
  )
}

export function BackofficePage() {
  const { t } = useTranslation()
  const canManage = useCanManage()
  const sites = useBoSites()
  const plans = useBoPlans()
  const catalog = useAnalyticsCatalog()
  const assign = useAssignPlan()

  if (!canManage) {
    return (
      <div>
        <PageHeader title={t('bo.title')} subtitle={t('bo.subtitle')} />
        <EmptyState text={t('bo.noAccess')} />
      </div>
    )
  }
  if (sites.isLoading || plans.isLoading || catalog.isLoading) {
    return (
      <div>
        <PageHeader title={t('bo.title')} subtitle={t('bo.subtitle')} />
        <SkeletonGrid count={4} item="h-40" cols="grid-cols-1 gap-3" />
      </div>
    )
  }

  const planList = plans.data ?? []
  const modules = catalog.data?.modules ?? []

  const doAssign = (id: number, tariff: string) =>
    assign.mutate(
      { id, tariff },
      { onSuccess: () => toast.success(t('bo.assigned')), onError: () => toast.error(t('common.noConnection')) },
    )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('bo.title')} subtitle={t('bo.subtitle')} />

      <section className="flex flex-col gap-3">
        <h2 className={H2}>{t('bo.orgs')}</h2>
        <Card className="overflow-hidden p-0">
          {(sites.data ?? []).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 border-b border-[var(--color-border-soft)] px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{s.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {t('bo.cameras')}: {s.cameras}
                </div>
              </div>
              <Select value={s.tariff} onChange={(v) => doAssign(s.id, v)}>
                {planList.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className={H2}>{t('bo.plans')}</h2>
        </div>
        <CreatePlan />
        <div className="flex flex-col gap-3">
          {planList.map((p) => (
            <PlanEditor key={p.key} plan={p} modules={modules} />
          ))}
        </div>
      </section>
    </div>
  )
}
