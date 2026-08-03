import { useCallback } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { HourBucket } from '@/shared/api/types'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from './chart'

// Почасовая активность — сгруппированные столбцы поверх Recharts (shadcn-блок chart).
// Цвета берутся из dataviz-палитры кита: --chart-1 (бренд) и --chart-6 (danger),
// т.е. те же токены, что и у остальных экранов, и тема переключается сама.
//
// Столбцы именно сгруппированы, а не сложены: alerts — подмножество events,
// стек бы удваивал счёт и врал о высоте.

interface HourlyActivityChartProps {
  data: HourBucket[]
  ariaLabel: string
  labels: { events: string; alerts: string }
  // Текст подсказки при наведении — приходит из i18n целой фразой
  tooltipFormat: (bucket: HourBucket) => string
}

export function HourlyActivityChart({ data, ariaLabel, labels, tooltipFormat }: HourlyActivityChartProps) {
  // Стабильная идентичность подсказки: обзор перезапрашивается по таймеру, а
  // новая функция на каждый рендер ломала мемоизацию recharts. Хук — до
  // раннего return, иначе нарушается порядок хуков.
  const tooltipContent = useCallback(
    ({ active, payload }: TooltipContentProps) =>
      active && payload?.length ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--chart-tooltip-border)] bg-[var(--chart-tooltip-bg)] px-2.5 py-1.5 text-caption text-[var(--color-text-primary)] shadow-[var(--shadow-md)]">
          {tooltipFormat(payload[0].payload as HourBucket)}
        </div>
      ) : null,
    [tooltipFormat],
  )

  if (data.length === 0) return null

  const config = {
    events: { label: labels.events, color: 'var(--chart-1)' },
    alerts: { label: labels.alerts, color: 'var(--chart-6)' },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      role="img"
      aria-label={ariaLabel}
      className="aspect-auto h-44 w-full"
    >
      <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        {/* fill задаём явно: recharts 3.x зашивает подписям осей #666, а селектор
            shadcn-обёртки его не перебивает (в v3 класс .recharts-cartesian-axis-tick-label).
            #666 давал 2.85:1 в тёмной теме — ниже AA; --chart-label держит ≥7:1 в обеих. */}
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          // 24 подписи не влезают — показываем каждую третью
          interval={2}
          tick={{ fill: 'var(--chart-label)' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tick={{ fill: 'var(--chart-label)' }}
        />
        <ChartTooltip cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }} content={tooltipContent} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="events" fill="var(--color-events)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="alerts" fill="var(--color-alerts)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
