import type { Severity } from '@/shared/api/types'

export function timeHMS(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const severityColor: Record<Severity, string> = {
  alert: 'var(--color-alert)',
  warning: 'var(--color-warning)',
  info: 'var(--color-muted)',
}

const EVENT_LABEL: Record<string, { ru: string; uz: string }> = {
  zone_intrusion: { ru: 'Вход в зону', uz: 'Zonaga kirish' },
  loitering: { ru: 'Долгое присутствие', uz: 'Uzoq turish' },
  after_hours_presence: { ru: 'Нерабочее время', uz: 'Ish vaqtidan tashqari' },
  person_entered: { ru: 'Человек вошёл', uz: 'Odam kirdi' },
  person_exited: { ru: 'Человек вышел', uz: 'Odam chiqdi' },
  camera_offline: { ru: 'Камера офлайн', uz: 'Kamera oflayn' },
  camera_online: { ru: 'Камера в сети', uz: 'Kamera onlayn' },
}

export function eventLabel(type: string, lang: string): string {
  const l = EVENT_LABEL[type]
  return l ? (lang === 'uz' ? l.uz : l.ru) : type
}

/** Интервалы поллинга — одно место (заменим при появлении WebSocket). */
export const POLL = {
  snapshots: 3000,
  events: 5000,
  stats: 30000,
} as const
