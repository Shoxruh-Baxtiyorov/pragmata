import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '@/shared/ui'
import type { AnalyticsModule, Camera, ModuleState, Zone } from '@/shared/api/types'
import { useManageCameras } from '@/features/manage/api/manageApi'
import { useAnalyticsCatalog, useSetModule } from '../api/analyticsApi'

const TIER_TONE: Record<string, 'success' | 'brand' | 'warning'> = {
  A: 'success',
  B: 'brand',
  C: 'warning',
}

// --- карточка одного модуля -------------------------------------------------

function ModuleCard({ module, camera }: { module: AnalyticsModule; camera: Camera }) {
  const { t } = useTranslation()
  const setModule = useSetModule()
  const isZone = module.scope === 'zone'
  const isSite = module.scope === 'site'
  const locked = module.tier === 'C'

  const zones = camera.zones ?? []
  const [zoneId, setZoneId] = useState<string>(zones[0]?.id ?? '')
  const zone: Zone | undefined = zones.find((z) => z.id === zoneId)

  // текущее состояние: с зоны (zone.rules) или с камеры (camera.analytics)
  const current: ModuleState | undefined = isZone
    ? (zone?.rules as Record<string, ModuleState> | undefined)?.[module.key]
    : camera.analytics?.[module.key]

  const [enabled, setEnabled] = useState(false)
  const [values, setValues] = useState<Record<string, unknown>>({})

  // пересеиваем форму при смене камеры/зоны/модуля
  useEffect(() => {
    setEnabled(Boolean(current?.enabled))
    const seed: Record<string, unknown> = {}
    for (const p of module.params) {
      seed[p.key] = current && p.key in current ? current[p.key] : p.default
    }
    setValues(seed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.id, zoneId, module.key, JSON.stringify(current)])

  const save = () => {
    if (isZone && !zoneId) {
      toast.error(t('analytics.needZone'))
      return
    }
    setModule
      .mutateAsync({
        scope: isZone ? 'zone' : 'camera',
        targetId: isZone ? zoneId : camera.id,
        moduleKey: module.key,
        enabled,
        params: values,
      })
      .then(() => toast.success(t('analytics.saved')))
      .catch(() => toast.error(t('common.noConnection')))
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[var(--color-text-primary)]">
              {module.name}
            </span>
            <Badge tone={TIER_TONE[module.tier]}>{t(`analytics.tier.${module.tier}`)}</Badge>
          </div>
          <p className="mt-1 text-[12.5px] text-[var(--color-text-secondary)]">
            {module.description}
          </p>
        </div>
        {!locked && !isSite && (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-semibold">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 accent-[var(--color-brand-500)]"
            />
            {enabled ? t('analytics.on') : t('analytics.off')}
          </label>
        )}
      </div>

      {locked && (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
          {t('analytics.needModel')}: {module.requires_model}
        </div>
      )}

      {isSite && (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] px-3 py-2 text-[12px] text-[var(--color-text-muted)]">
          {t('analytics.siteScope')}
        </div>
      )}

      {!locked && !isSite && (
        <>
          {isZone && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {t('analytics.zone')}
              </span>
              {zones.length === 0 ? (
                <span className="text-[12px] text-[var(--color-warning-600)]">
                  {t('analytics.noZones')}
                </span>
              ) : (
                <Select value={zoneId} onChange={setZoneId} className="w-full">
                  {zones.map((z) => (
                    <option key={z.id} value={z.id ?? ''}>
                      {z.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}

          {enabled && module.params.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {module.params.map((p) => (
                <div key={p.key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                    {p.label}
                    {p.unit ? `, ${p.unit}` : ''}
                  </span>
                  {p.type === 'bool' ? (
                    <label className="flex cursor-pointer items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={Boolean(values[p.key])}
                        onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.checked }))}
                        className="size-4 accent-[var(--color-brand-500)]"
                      />
                      {Boolean(values[p.key]) ? t('analytics.yes') : t('analytics.no')}
                    </label>
                  ) : p.type === 'select' ? (
                    <Select
                      value={String(values[p.key] ?? '')}
                      onChange={(val) => setValues((v) => ({ ...v, [p.key]: val }))}
                      className="w-full"
                    >
                      {(p.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type={p.type === 'text' ? 'text' : 'number'}
                      value={String(values[p.key] ?? '')}
                      min={p.min}
                      max={p.max}
                      step={p.type === 'float' ? '0.1' : '1'}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [p.key]: p.type === 'text' ? e.target.value : Number(e.target.value),
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={save}
              loading={setModule.isPending}
              disabled={isZone && zones.length === 0}
            >
              {t('analytics.save')}
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

// --- страница ---------------------------------------------------------------

export function AnalyticsPage() {
  const { t } = useTranslation()
  const catalog = useAnalyticsCatalog()
  const cams = useManageCameras()
  const [camId, setCamId] = useState('')

  const cameras = cams.data ?? []
  const camera = cameras.find((c) => c.id === camId) ?? cameras[0]

  useEffect(() => {
    if (!camId && cameras[0]) setCamId(cameras[0].id)
  }, [cameras, camId])

  const byCategory = useMemo(() => {
    const map = new Map<string, AnalyticsModule[]>()
    for (const m of catalog.data?.modules ?? []) {
      const arr = map.get(m.category) ?? []
      arr.push(m)
      map.set(m.category, arr)
    }
    return map
  }, [catalog.data])

  if (catalog.isLoading || cams.isLoading) {
    return (
      <div>
        <PageHeader title={t('analytics.title')} subtitle={t('analytics.subtitle')} />
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </div>
    )
  }

  if (catalog.isError || !catalog.data) {
    return (
      <div>
        <PageHeader title={t('analytics.title')} subtitle={t('analytics.subtitle')} />
        <EmptyState text={t('common.noConnection')} onRetry={() => void catalog.refetch()} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('analytics.title')}
        subtitle={t('analytics.subtitle')}
        actions={
          cameras.length > 0 ? (
            <Select value={camId} onChange={setCamId}>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : undefined
        }
      />

      {/* легенда tier */}
      <div className="mb-5 flex flex-wrap gap-2">
        {catalog.data.tiers.map((tr) => (
          <Badge key={tr.key} tone={TIER_TONE[tr.key]}>
            {t(`analytics.tier.${tr.key}`)}
          </Badge>
        ))}
      </div>

      {!camera ? (
        <EmptyState text={t('analytics.noCameras')} />
      ) : (
        <div className="flex flex-col gap-8">
          {catalog.data.categories.map((cat) => {
            const mods = byCategory.get(cat.key) ?? []
            if (mods.length === 0) return null
            return (
              <section key={cat.key} className="flex flex-col gap-3">
                <h2 className="text-[15px] font-extrabold tracking-tight text-[var(--color-text-primary)]">
                  {cat.label}
                </h2>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {mods.map((m) => (
                    <ModuleCard key={m.key} module={m} camera={camera} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
