import { cn } from '@/shared/lib/utils'

// Апертура Pragmata: 6 лепестков камерной диафрагмы (60°-симметрия).
// Один лепесток + 6 поворотов; заливка currentColor → тема/цвет задаётся снаружи.
const BLADE = 'M95.94 52.41 A46 46 0 0 1 75.05 88.58 L51.83 64.89 L63.12 57.27 Z'
const BLADES = [0, 1, 2, 3, 4, 5]

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {BLADES.map((k) => (
        <path key={k} d={BLADE} transform={`rotate(${k * 60} 50 50)`} />
      ))}
    </svg>
  )
}

// Полный логотип: знак + вордмарк «PRAGMATA AI». Цвет — бирюзовый бренд-знак.
export function Logo({
  size = 26,
  wordmark = true,
  className,
}: {
  size?: number
  wordmark?: boolean
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-2.5 text-[var(--color-brand-mark)]', className)}
      aria-label="Pragmata AI"
    >
      <LogoMark size={size} />
      {wordmark && (
        <span
          className="font-extrabold uppercase leading-none"
          style={{ letterSpacing: '0.15em', fontSize: Math.round(size * 0.6) }}
        >
          Pragmata&nbsp;AI
        </span>
      )}
    </span>
  )
}
