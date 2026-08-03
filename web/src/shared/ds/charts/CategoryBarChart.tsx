import { useCallback } from 'react'
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'
import type { YAxisTickContentProps } from 'recharts'
import type { LucideIcon } from '@/shared/ds/icons'
import { ChartContainer, type ChartConfig } from './chart'

// Горизонтальный рейтинг категорий (по типам событий, по камерам) поверх Recharts.
// Цвет — --chart-1 из dataviz-палитры кита, как и у почасового графика.
//
// Подпись строки рисуется через foreignObject: иконка типа события + текст с
// многоточием. Обычный <text> в SVG не умеет ни то, ни другое.

const ROW_H = 34
const LABEL_W = 176

interface CategoryBarChartProps {
  data: Record<string, number>
  ariaLabel: string
  emptyText: string
  // Сырой ключ → человекочитаемая подпись (по умолчанию — как есть)
  formatLabel?: (key: string) => string
  // Иконка слева от подписи; undefined — строка без иконки
  icon?: (key: string) => LucideIcon | undefined
}

export function CategoryBarChart({
  data,
  ariaLabel,
  emptyText,
  formatLabel,
  icon,
}: CategoryBarChartProps) {
  const rows = Object.entries(data)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)

  // Идентичность Tick держим стабильной: страница опрашивает API раз в 30с, а
  // новая функция на каждый рендер заставляла recharts перерисовывать все
  // подписи. Хук — до раннего return, иначе нарушается порядок хуков.
  const Tick = useCallback(
    ({ x, y, payload }: YAxisTickContentProps) => {
      const key = String(payload?.value ?? '')
      const Icon = icon?.(key)
      return (
        <g transform={`translate(${Number(x) || 0},${Number(y) || 0})`}>
          <foreignObject x={-LABEL_W} y={-ROW_H / 2} width={LABEL_W} height={ROW_H}>
            <div
              title={key}
              // pl-0.5 — запас слева: без него первый глиф упирается ровно в край SVG
              className="flex h-full items-center justify-end gap-1.5 pl-0.5 pr-2 text-body text-[var(--color-text-secondary)]"
            >
              {Icon && <Icon size={16} className="shrink-0" />}
              <span className="truncate">{formatLabel ? formatLabel(key) : key}</span>
            </div>
          </foreignObject>
        </g>
      )
    },
    [icon, formatLabel],
  )

  // без этого пустые данные давали глухую пустую карточку — выглядело как поломка
  if (rows.length === 0)
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-soft)] px-4 py-6 text-center text-label text-[var(--color-text-secondary)]">
        {emptyText}
      </p>
    )

  const config = { value: { color: 'var(--chart-1)' } } satisfies ChartConfig

  return (
    <ChartContainer
      config={config}
      role="img"
      aria-label={ariaLabel}
      className="aspect-auto w-full"
      style={{ height: rows.length * ROW_H + 8 }}
    >
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        {/* width обязателен: при width<=0 recharts 3.x возвращает null на всю ось,
            и кастомный Tick с иконкой/подписью просто не рисуется.
            tickSize/tickMargin = 0 — иначе тик уезжает влево на 8px и SVG
            (overflow: hidden) срезает первую букву длинной подписи. */}
        <YAxis
          type="category"
          dataKey="key"
          width={LABEL_W}
          axisLine={false}
          tickLine={false}
          tickSize={0}
          tickMargin={0}
          tick={Tick}
        />
        {/* тултип не нужен: значение уже подписано справа от столбца */}
        <Bar dataKey="value" fill="var(--color-value)" radius={4} barSize={12}>
          <LabelList
            dataKey="value"
            position="right"
            offset={10}
            className="fill-[var(--color-text-primary)] font-mono text-caption"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
