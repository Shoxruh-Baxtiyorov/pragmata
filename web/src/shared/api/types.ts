// Контракт Dashboard API. Источник истины — openapi.json бэкенда (/docs).
// TODO(feat/web): заменить на генерацию `openapi-typescript` из ${VITE_API_URL}/openapi.json.

export type Severity = 'info' | 'warning' | 'alert'

export type EventType =
  | 'person_entered'
  | 'person_exited'
  | 'zone_intrusion'
  | 'loitering'
  | 'after_hours_presence'
  | 'camera_offline'
  | 'camera_online'

export interface Zone {
  name: string
  type: string
  polygon: [number, number][]
}

export interface Camera {
  id: string
  name: string
  online: boolean
  snapshot_url: string | null
  zones: Zone[]
}

export interface EventItem {
  id: string
  camera_id: string
  camera: string
  type: EventType
  severity: Severity
  zone: string | null
  t_start: string
  t_end: string
  duration_s: number
  description: string | null
  people_in_zone: number | null
  photo_url: string | null
  face_url: string | null
  clip_url: string | null
}

export interface EventsPage {
  total: number
  items: EventItem[]
}

export interface Stats {
  hours: number
  visitors_entered: number
  alerts: number
  false_positives: number
  by_type: Record<string, number>
  by_camera: Record<string, number>
}

export interface HourBucket {
  hour: string
  events: number
  alerts: number
}

export interface Overview {
  visitors_today: number
  alerts_today: number
  cameras_online: number
  cameras_total: number
  false_positives_today: number
  hourly: HourBucket[]
  recent_alerts: EventItem[]
}

export interface SystemCamera {
  id: string
  name: string
  online: boolean
  last_event: string | null
  events_24h: number
}

export interface SystemInfo {
  site_name: string
  timezone: string
  cameras: SystemCamera[]
  yolo_model: string
  agent_enabled: boolean
  vlm_enabled: boolean
  offline_mode: boolean
  media_dir: string
  events_total: number
}

export interface PersonAppearance {
  time: string
  camera: string
  type: string
  photo_url: string | null
}

export interface Digest {
  text: string
}

export interface FindItem {
  time: string
  camera: string
  similarity: number
  photo_url: string | null
}
