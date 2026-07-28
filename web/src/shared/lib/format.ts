import type { Severity } from '@/shared/api/types'

// Интервалы поллинга (мс) — единая точка замены на WebSocket в будущем
export const POLL = {
  snapshots: 250, // живая стена ~2.5 fps; пайплайн пишет кадр 4×/сек
  events: 5000,
  stats: 30000,
} as const

export type EventType =
  | 'zone_intrusion'
  | 'loitering'
  | 'after_hours_presence'
  | 'person_entered'
  | 'person_exited'
  | 'camera_offline'
  | 'camera_online'
  | 'watchlist_match'
  | 'person_recognized'
  | 'weapon_detected'
  | 'vehicle_seen'
  | 'crowd_gathering'
  | 'queue_buildup'
  | 'danger_zone_presence'
  | 'hygiene_violation'
  | 'fire_smoke'
  | 'ppe_violation'
  | 'package_damage'
  | 'abandoned_object'

// Подписи типов событий — вне i18n-ресурсов (доменные, не интерфейсные)
const EVENT_LABELS: Record<EventType, { ru: string; uz: string; en: string }> = {
  zone_intrusion: { ru: 'Вход в зону', uz: 'Zonaga kirish', en: 'Entered zone' },
  loitering: { ru: 'Задержка в зоне', uz: 'Zonada qolish', en: 'Lingering' },
  after_hours_presence: {
    ru: 'Присутствие в нерабочее время',
    uz: 'Ish vaqtidan tashqari',
    en: 'After-hours presence',
  },
  person_entered: { ru: 'Человек появился', uz: 'Odam keldi', en: 'Person arrived' },
  person_exited: { ru: 'Человек ушёл', uz: 'Odam ketdi', en: 'Person left' },
  camera_offline: { ru: 'Камера offline', uz: 'Kamera offline', en: 'Camera offline' },
  camera_online: { ru: 'Камера online', uz: 'Kamera online', en: 'Camera online' },
  watchlist_match: {
    ru: 'Человек из списка наблюдения',
    uz: 'Kuzatuv roʻyxatidagi odam',
    en: 'Person from the watchlist',
  },
  person_recognized: { ru: 'Распознан', uz: 'Aniqlandi', en: 'Recognized' },
  weapon_detected: { ru: 'Обнаружено оружие', uz: 'Qurol aniqlandi', en: 'Weapon detected' },
  vehicle_seen: { ru: 'Транспорт', uz: 'Transport', en: 'Vehicle' },
  crowd_gathering: { ru: 'Скопление людей', uz: 'Odamlar toʻplanishi', en: 'Crowd gathering' },
  queue_buildup: { ru: 'Очередь', uz: 'Navbat', en: 'Queue buildup' },
  danger_zone_presence: {
    ru: 'В опасной зоне',
    uz: 'Xavfli zonada',
    en: 'In danger zone',
  },
  hygiene_violation: {
    ru: 'Нарушение гигиены',
    uz: 'Gigiena buzilishi',
    en: 'Hygiene violation',
  },
  fire_smoke: { ru: 'Огонь / дым', uz: 'Olov / tutun', en: 'Fire / smoke' },
  ppe_violation: { ru: 'Нарушение СИЗ', uz: 'SHV buzilishi', en: 'PPE violation' },
  package_damage: {
    ru: 'Повреждение упаковки',
    uz: 'Qadoq shikasti',
    en: 'Package damage',
  },
  abandoned_object: {
    ru: 'Оставленный предмет',
    uz: 'Qarovsiz buyum',
    en: 'Abandoned object',
  },
}

export function eventLabel(type: string, lang: 'ru' | 'uz' | 'en'): string {
  return EVENT_LABELS[type as EventType]?.[lang] ?? type
}

// Цвет по важности — CSS-переменные токенов (inline: рамка/иконка)
export const severityColor: Record<Severity, string> = {
  alert: 'var(--color-error)',
  warning: 'var(--color-warning)',
  info: 'var(--color-brand)',
}

// Тон Badge по важности (tone из scaffold: neutral|brand|success|warning|error)
export const severityTone: Record<Severity, 'neutral' | 'brand' | 'success' | 'warning' | 'error'> =
  {
    alert: 'error',
    warning: 'warning',
    info: 'neutral',
  }

export function timeHMS(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
