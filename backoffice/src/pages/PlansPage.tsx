import { AppPage } from '@/shared/ui/layout/AppPage'
import { Card, StatusBadge } from '@/shared/ui'
import { Check } from '@/shared/ui/icons'
import { useSites } from '@/api/queries'

interface Plan {
  key: string
  name: string
  price: string
  tone: 'neutral' | 'info' | 'success'
  audience: string
  features: string[]
  retention: string
}

const PLANS: Plan[] = [
  {
    key: 'basic',
    name: "Ko'z (Basic)",
    price: '40 000 сум / камера · мес',
    tone: 'neutral',
    audience: 'магазин, кафе, малый офис',
    features: ['Люди, вход/выход, тревоги', 'Зоны, нерабочие часы', 'Telegram-алерты', 'AI-ассистент (базовый)'],
    retention: 'хранение 7 дней',
  },
  {
    key: 'pro',
    name: 'Nazorat (Pro)',
    price: '90 000 сум / камера · мес',
    tone: 'info',
    audience: 'склад, школа, клиника, сеть',
    features: [
      'Всё из Basic',
      'Детекция оружия (VLM)',
      'Реестр лиц + watchlist',
      'Транспорт + номера (ANPR)',
      'Архив/форензика',
      'Поиск по внешности',
    ],
    retention: 'хранение 90 дней',
  },
  {
    key: 'enterprise',
    name: 'Qalqon (Enterprise)',
    price: 'от 150 000 сум + setup',
    tone: 'success',
    audience: 'гос, банки, заводы',
    features: ['Всё из Pro', 'Полный офлайн (air-gap)', 'Аудит-лог, соответствие', 'Кастомные правила + пульт', 'Выделенный суппорт + SLA'],
    retention: 'хранение год+',
  },
]

export function PlansPage() {
  const q = useSites()
  const counts = (q.data ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.tariff] = (acc[s.tariff] ?? 0) + 1
    return acc
  }, {})

  return (
    <AppPage title="Тарифы" description="Каталог планов — организации выбирают из этого списка">
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.key} className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[17px] font-extrabold text-[var(--color-text-primary)]">
                  {p.name}
                </div>
                <div className="mt-0.5 text-[12.5px] text-[var(--color-text-muted)]">{p.audience}</div>
              </div>
              <StatusBadge tone={p.tone}>{counts[p.key] ?? 0} орг.</StatusBadge>
            </div>
            <div className="text-[15px] font-bold text-[var(--color-brand-500)]">{p.price}</div>
            <ul className="flex flex-col gap-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-[var(--color-text-secondary)]">
                  <Check size={15} className="mt-0.5 shrink-0 text-[var(--color-success-500)]" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto border-t border-[var(--color-border-soft)] pt-3 text-[12px] text-[var(--color-text-muted)]">
              {p.retention}
            </div>
          </Card>
        ))}
      </div>
    </AppPage>
  )
}
