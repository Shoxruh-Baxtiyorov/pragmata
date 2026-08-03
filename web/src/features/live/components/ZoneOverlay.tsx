import type { Camera } from '@/shared/api/types'

/**
 * Оверлей зон поверх кадра: polygon в долях 0..1 → viewBox 0..100.
 * Цвет — бренд (как в редакторе зон): зона это разметка, а не тревога, красный
 * здесь читался бы как «сейчас что-то происходит».
 * non-scaling-stroke: viewBox растягивается неравномерно (preserveAspectRatio
 * none), иначе линия по горизонтали толще, чем по вертикали.
 */
export function ZoneOverlay({ zones }: { zones: Camera['zones'] }) {
  if (zones.length === 0) return null
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {zones.map((z) => (
        <polygon
          key={z.name}
          points={z.polygon.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
          fill="color-mix(in srgb, var(--color-brand-500) 14%, transparent)"
          stroke="var(--color-brand-500)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
