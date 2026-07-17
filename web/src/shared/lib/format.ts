import type { EventType, Severity } from '@/shared/api/types'

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

export const eventIcon: Record<EventType, string> = {
  zone_intrusion: '🚨',
  loitering: '⏳',
  after_hours_presence: '🌙',
  person_entered: '👤',
  person_exited: '🚪',
  camera_offline: '📵',
  camera_online: '✅',
}

/** Интервалы поллинга — одно место (заменим при появлении WebSocket). */
export const POLL = {
  snapshots: 3000,
  events: 5000,
  stats: 30000,
} as const
