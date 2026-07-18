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
