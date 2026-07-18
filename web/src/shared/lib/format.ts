// Интервалы поллинга (мс) — единая точка замены на WebSocket в будущем
export const POLL = {
  snapshots: 3000,
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
}

export function eventLabel(type: string, lang: 'ru' | 'uz' | 'en'): string {
  return EVENT_LABELS[type as EventType]?.[lang] ?? type
}
