import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge, Button, Card, EmptyState, PageHeader, Select, SkeletonGrid } from '@/shared/ui'
import { PERSON_CATEGORIES, type AnalyticsModule } from '@/shared/api/types'
import { useAnalyticsCatalog } from '@/features/analytics/api/analyticsApi'
import { useCanManage } from '@/features/auth'
import {
  type PlanRow,
  useAssignPlan,
  useBoPlans,
  useBoSites,
  useSavePlanEntitlements,
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

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
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

// пусто/["*"] в тарифе = «всё» → в редакторе показываем все галочки
function seed(raw: string[] | undefined, all: string[]): Set<string> {
  if (raw === undefined || raw.includes('*')) return new Set(all)
  return new Set(raw)
}

function PlanEditor({ plan, modules }: { plan: PlanRow; modules: AnalyticsModule[] }) {
  const { t } = useTranslation()
  const save = useSavePlanEntitlements()
  const allMods = useMemo(() => modules.map((m) => m.key), [modules])
  const [mods, setMods] = useState(() => seed(plan.entitlements.modules, allMods))
  const [feats, setFeats] = useState(() =>
    seed(
      plan.entitlements.features,
      FEATURE_KEYS.map((f) => f.key),
    ),
  )
  const [cats, setCats] = useState(() => seed(plan.entitlements.person_categories, [...PERSON_CATEGORIES]))

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
        entitlements: {
          modules: [...mods],
          features: [...feats],
          person_categories: [...cats],
        },
      },
      { onSuccess: () => toast.success(t('bo.saved')), onError: () => toast.error(t('common.noConnection')) },
    )

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--color-text-primary)]">{plan.name}</span>
          <Badge tone="neutral">{plan.key}</Badge>
        </div>
        <Button size="sm" onClick={submit} loading={save.isPending}>
          {t('bo.save')}
        </Button>
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
        <h2 className={H2}>{t('bo.plans')}</h2>
        <div className="flex flex-col gap-3">
          {planList.map((p) => (
            <PlanEditor key={p.key} plan={p} modules={modules} />
          ))}
        </div>
      </section>
    </div>
  )
}
