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
  id: string | null
  name: string
  type: string
  polygon: [number, number][]
  rules: Record<string, unknown>
}

export interface Camera {
  id: string
  name: string
  online: boolean
  enabled: boolean
  snapshot_url: string | null
  zones: Zone[]
}

export interface CameraInput {
  id: string
  name: string
  url: string
  process_fps?: number
  detect_conf?: number
  detect_imgsz?: number
  clips_enabled?: boolean
}

export interface ZoneInput {
  name: string
  type?: string
  polygon: [number, number][]
  zone_intrusion?: boolean
  hysteresis_frames?: number
  loitering?: boolean
  dwell_s?: number
}

export interface Person {
  id: string
  name: string
  note: string | null
  watch: boolean
  photo_url: string | null
  seen_count: number
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

export interface MediaEvidence {
  caption: string
  photo_url: string | null
  clip_url: string | null
}

export interface AgentAnswer {
  text: string
  evidence: MediaEvidence[]
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
