// Источник истины — openapi.json в корне репо (make api-schema).
// Типы пока пишутся вручную; при изменении API сверяйся с контрактом.
// TODO(feat/web): генерация через openapi-typescript из ${VITE_API_URL}/openapi.json

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface MeResponse {
  sub: string
}

export interface HourBucket {
  hour: string
  events: number
  alerts: number
}

export interface EventOut {
  id: string
  camera_id: string
  camera: string
  type: string
  severity: string
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

export interface OverviewOut {
  visitors_today: number
  alerts_today: number
  cameras_online: number
  cameras_total: number
  false_positives_today: number
  hourly: HourBucket[]
  recent_alerts: EventOut[]
}

export type Severity = 'info' | 'warning' | 'alert'

// EventsPage
export interface EventsResponse {
  items: EventOut[]
  total: number
}

// ZoneOut
export interface Zone {
  name: string
  type: string
  polygon: [number, number][]
}

// CameraOut
export interface Camera {
  id: string
  name: string
  online: boolean
  snapshot_url: string | null
  zones: Zone[]
}

// StatsOut
export interface Stats {
  hours: number
  visitors_entered: number
  alerts: number
  false_positives: number
  by_type: Record<string, number>
  by_camera: Record<string, number>
}

// DigestOut
export interface Digest {
  text: string
}

// SystemCamera
export interface SystemCamera {
  id: string
  name: string
  online: boolean
  last_event: string | null
  events_24h: number
}

// SystemOut
export interface SystemInfo {
  site_name: string
  timezone: string
  yolo_model: string
  media_dir: string
  cameras: SystemCamera[]
  agent_enabled: boolean
  vlm_enabled: boolean
  offline_mode: boolean
  events_total: number
}

// FindItem
export interface FindItem {
  time: string
  camera: string
  similarity: number
  photo_url: string | null
}

// PersonAppearance
export interface PersonAppearance {
  time: string
  camera: string
  type: string
  photo_url: string | null
}

// MediaEvidence
export interface MediaEvidence {
  caption: string
  photo_url: string | null
  clip_url: string | null
}

// AgentAnswer
export interface AgentAnswer {
  text: string
  evidence: MediaEvidence[]
}
