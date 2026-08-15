import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  FieldLabel,
  Input,
  PageHeader,
  Select,
  SkeletonGrid,
} from '@/shared/ui'
import type { AnalyticsModule, Camera, ModuleState, Zone } from '@/shared/api/types'
import { useManageCameras } from '@/features/manage/api/manageApi'
import { useAnalyticsCatalog, useSetModule } from '../api/analyticsApi'

// Цвет = смысл: A работает как есть (нейтральный), B требует ИИ-зрения,
// C заблокирован до установки модели. Зелёный здесь не используем — на этих
// экранах он уже занят статусом «камера онлайн».
const TIER_TONE: Record<string, 'neutral' | 'brand' | 'warning'> = {
  A: 'neutral',
  B: 'brand',
  C: 'warning',
}

const NOTE_BOX =
  'rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] px-3 py-2 text-xs text-[var(--color-text-secondary)]'

// --- карточка одного модуля -------------------------------------------------

function ModuleCard({ module, camera }: { module: AnalyticsModule; camera: Camera }) {
  const { t } = useTranslation()
  const setModule = useSetModule()
  const isZone = module.scope === 'zone'
  const isSite = module.scope === 'site'
  const notEntitled = module.entitled === false
  // заблокирован = нет модели (tier C) ИЛИ модуль не входит в тариф площадки
  const locked = module.tier === 'C' || notEntitled

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
    <Card
      className={`flex flex-col gap-3 p-4 transition-shadow duration-[var(--dur-normal)] hover:shadow-[var(--shadow-sm)] ${
        notEntitled ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[var(--color-text-primary)]">
              {t(`an.mod.${module.key}`, { defaultValue: module.name })}
            </span>
            <Badge tone={TIER_TONE[module.tier]}>{t(`analytics.tier.${module.tier}`)}</Badge>
            {notEntitled && <Badge tone="warning">{t('analytics.lockedBadge')}</Badge>}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {t(`an.moddesc.${module.key}`, { defaultValue: module.description })}
          </p>
        </div>
        {!locked && !isSite && (
          <label className="-my-1 flex shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 text-xs font-bold transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-bg-muted)] has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-[var(--color-brand-ring)]">
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

      {notEntitled ? (
        <div className={NOTE_BOX}>{t('analytics.notInPlan')}</div>
      ) : module.tier === 'C' ? (
        <div className={NOTE_BOX}>
          {t('analytics.needModel')}: {module.requires_model}
        </div>
      ) : null}

      {isSite && <div className={NOTE_BOX}>{t('analytics.siteScope')}</div>}

      {!locked && !isSite && (
        <>
          {isZone && (
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{t('analytics.zone')}</FieldLabel>
              {zones.length === 0 ? (
                <ErrorNote tone="warning">{t('analytics.noZones')}</ErrorNote>
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
            <div className="grid grid-cols-1 gap-3 border-t border-[var(--color-border-soft)] pt-3 sm:grid-cols-2">
              {module.params.map((p) => (
                <div key={p.key} className="flex flex-col gap-1.5">
                  <FieldLabel>
                    {t(`an.param.${p.key}`, { defaultValue: p.label })}
                    {p.unit ? `, ${p.unit}` : ''}
                  </FieldLabel>
                  {p.type === 'bool' ? (
                    <label className="flex h-11 cursor-pointer items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={Boolean(values[p.key])}
                        onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.checked }))}
                        className="size-4 accent-[var(--color-brand-500)]"
                      />
                      {values[p.key] ? t('analytics.yes') : t('analytics.no')}
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

          <div className="flex justify-end border-t border-[var(--color-border-soft)] pt-3">
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
        {/* Скелет повторяет сетку карточек — раньше был одинокий спиннер по центру */}
        <SkeletonGrid count={6} item="h-36" cols="grid-cols-1 gap-3 lg:grid-cols-2" />
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
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] px-3 py-2">
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
                <h2 className="text-base font-extrabold tracking-tight text-[var(--color-text-primary)]">
                  {t(`an.cat.${cat.key}`, { defaultValue: cat.label })}
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
