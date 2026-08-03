import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, PageHeader, Select, Skeleton } from '@/shared/ui'
import { LayoutGrid } from '@/shared/ui/icons'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { useHeatmap, useHeatmapCameras, type Heatmap } from '../api/heatmapApi'

// Тепловое наложение: сетка счётчиков → canvas, hue от синего (мало) к красному
// (много), альфа растёт с интенсивностью. CSS-blur сглаживает клетки.
function HeatCanvas({ hm }: { hm: Heatmap }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const { w, h, grid, max } = hm
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    if (max <= 0) return
    for (let y = 0; y < h; y++) {
      const row = grid[y] ?? []
      for (let x = 0; x < w; x++) {
        const v = (row[x] ?? 0) / max
        if (v <= 0) continue
        const hue = 240 * (1 - Math.min(v, 1)) // 240=синий → 0=красный
        ctx.globalAlpha = Math.min(0.9, 0.2 + v * 0.8)
        ctx.fillStyle = `hsl(${hue} 95% 50%)`
        ctx.fillRect(x, y, 1, 1)
      }
    }
    ctx.globalAlpha = 1
  }, [hm])
  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ filter: 'blur(9px)', mixBlendMode: 'plus-lighter' }}
    />
  )
}

function Legend() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
      <span>{t('heatmap.low')}</span>
      {/* Те же hue, что и у canvas (240→0), чтобы шкала читалась буквально */}
      <div
        className="h-2 w-40 rounded-[var(--radius-pill)]"
        style={{
          background: 'linear-gradient(90deg, hsl(240 95% 50%), hsl(120 95% 50%), hsl(0 95% 50%))',
        }}
      />
      <span>{t('heatmap.high')}</span>
    </div>
  )
}

function HeatView({ cameraId }: { cameraId: string }) {
  const { t } = useTranslation()
  const { data, isLoading, isError, error, refetch } = useHeatmap(cameraId)
  const snap = useAuthedMedia(data?.snapshot_url ?? null)
  if (isLoading) return <Skeleton className="aspect-video w-full" />
  if (isError && !data) return <EmptyState text={apiErrorMessage(error, t)} onRetry={refetch} />
  if (!data) return <EmptyState text={t('heatmap.empty')} />
  const hasData = data.max > 0
  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)]">
        {snap ? (
          <img src={snap} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-[var(--color-text-muted)]">
            <LayoutGrid size={32} />
          </div>
        )}
        {hasData && <HeatCanvas hm={data} />}
        {!hasData && (
          // Затемнение через токен фона: на светлой теме чёрная пелена выглядит
          // как ошибка, а тут это просто «данных пока нет».
          <div className="absolute inset-0 grid place-items-center bg-[var(--color-bg-app)]/60 backdrop-blur-[1px]">
            <p className="rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] shadow-[var(--shadow-xs)]">
              {t('heatmap.collecting')}
            </p>
          </div>
        )}
      </div>
      {hasData && <Legend />}
    </div>
  )
}

export function HeatmapPage() {
  const { t } = useTranslation()
  const { data: cameras, isLoading } = useHeatmapCameras()
  const [camId, setCamId] = useState<string>('')
  const list = useMemo(() => cameras ?? [], [cameras])
  const active = camId || list[0]?.id || ''

  return (
    <div>
      <PageHeader
        title={t('heatmap.title')}
        subtitle={t('heatmap.subtitle')}
        actions={
          list.length > 0 && (
            <Select value={active} onChange={setCamId}>
              {list.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )
        }
      />
      {isLoading ? (
        <Skeleton className="aspect-video w-full" />
      ) : active ? (
        <HeatView cameraId={active} />
      ) : (
        <EmptyState text={t('heatmap.noCameras')} />
      )}
    </div>
  )
}
