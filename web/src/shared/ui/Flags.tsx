/* Флаги для переключателя языка — инлайновый SVG, не эмодзи: эмодзи-флаги
 * рисует шрифт ОС (на Windows их вообще нет, там остаются буквы «UZ»), а нам
 * нужен одинаковый вид везде.
 *
 * Рисуем в viewBox 30×20 (3:2) и показываем ~18px шириной. На таком размере
 * пятиконечная звезда занимает меньше пикселя, поэтому 12 звёзд узбекского
 * флага набраны точками — форма не читается, а ряды 3/4/5 читаются.
 */

type FlagProps = { size?: number; className?: string }

// Рамка: на светлой теме белые полосы иначе сливаются с фоном
function Frame() {
  return <rect x="0.5" y="0.5" width="29" height="19" rx="2.5" fill="none" stroke="rgba(0,0,0,0.2)" />
}

const UZ_STARS: [number, number][] = [
  [12, 1.7],
  [14.2, 1.7],
  [16.4, 1.7],
  [9.8, 3.2],
  [12, 3.2],
  [14.2, 3.2],
  [16.4, 3.2],
  [7.6, 4.7],
  [9.8, 4.7],
  [12, 4.7],
  [14.2, 4.7],
  [16.4, 4.7],
]

export function FlagUz({ size = 18, className }: FlagProps) {
  return (
    <svg
      width={size}
      height={(size / 3) * 2}
      viewBox="0 0 30 20"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="fl-uz">
          <rect width="30" height="20" rx="3" />
        </clipPath>
      </defs>
      <g clipPath="url(#fl-uz)">
        <rect width="30" height="6.4" fill="#0099B5" />
        <rect y="6.4" width="30" height="7.2" fill="#CE1126" />
        <rect y="6.9" width="30" height="6.2" fill="#fff" />
        <rect y="13.6" width="30" height="6.4" fill="#1EB53A" />
        {/* полумесяц: круг минус смещённый круг цвета полосы */}
        <circle cx="5.6" cy="3.2" r="2.3" fill="#fff" />
        <circle cx="6.7" cy="3.2" r="2.3" fill="#0099B5" />
        {UZ_STARS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.62" fill="#fff" />
        ))}
      </g>
      <Frame />
    </svg>
  )
}

export function FlagRu({ size = 18, className }: FlagProps) {
  return (
    <svg
      width={size}
      height={(size / 3) * 2}
      viewBox="0 0 30 20"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="fl-ru">
          <rect width="30" height="20" rx="3" />
        </clipPath>
      </defs>
      <g clipPath="url(#fl-ru)">
        <rect width="30" height="20" fill="#fff" />
        <rect y="6.67" width="30" height="6.66" fill="#0039A6" />
        <rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
      </g>
      <Frame />
    </svg>
  )
}

export function FlagGb({ size = 18, className }: FlagProps) {
  return (
    <svg
      width={size}
      height={(size / 3) * 2}
      viewBox="0 0 30 20"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="fl-gb">
          <rect width="30" height="20" rx="3" />
        </clipPath>
      </defs>
      <g clipPath="url(#fl-gb)">
        <rect width="30" height="20" fill="#012169" />
        {/* диагонали: белые под красными */}
        <path d="M0 0 30 20 M30 0 0 20" stroke="#fff" strokeWidth="4" />
        <path d="M0 0 30 20 M30 0 0 20" stroke="#C8102E" strokeWidth="1.7" />
        {/* прямой крест */}
        <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6.4" />
        <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.8" />
      </g>
      <Frame />
    </svg>
  )
}
