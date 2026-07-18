import { cn } from '@/shared/lib/utils'
import type { HourBucket } from '@/shared/api/types'

// Почасовая активность в стиле Plausible — чистый CSS/flex, без графических библиотек.
// Высота столбца = events / max * 100%; нулевые часы — приглушённый обрубок (bg-grey-2),
// чтобы ряд не был пустым. Часы с тревогами подсвечиваются красным (bg-error).
// hour приходит уже отформатированным ("14:00") — рендерим как есть.

interface HourlyBarsProps {
  data: HourBucket[]
  ariaLabel: string
  // Текст нативного title при наведении (по умолчанию — часы + счётчики событий/тревог)
  titleFormat?: (bucket: HourBucket) => string
}

const defaultTitle = (b: HourBucket) => `${b.hour} — ${b.events} events, ${b.alerts} alerts`

export function HourlyBars({ data, ariaLabel, titleFormat = defaultTitle }: HourlyBarsProps) {
  if (data.length === 0) return null

  // max по events; если все нули — каждый столбец рисуется обрубком в 2px
  const max = Math.max(...data.map((b) => b.events))

  return (
    <div>
      <div role="img" aria-label={ariaLabel} className="flex h-32 items-end gap-1">
        {data.map((b) => (
          <div
            key={b.hour}
            title={titleFormat(b)}
            className={cn('flex-1 rounded-t-[4px]', b.alerts > 0 ? 'bg-error' : 'bg-brand')}
            style={{ height: b.events > 0 ? `${(b.events / max) * 100}%` : '2px' }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-caption text-text-secondary">
        <span>{data[0].hour}</span>
        <span>{data[data.length - 1].hour}</span>
      </div>
    </div>
  )
}
