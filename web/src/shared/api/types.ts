// Источник истины — openapi.json в корне репо (make api-schema).
// Типы пока пишутся вручную; при изменении API сверяйся с контрактом.
// TODO(feat/web): генерация через openapi-typescript из ${VITE_API_URL}/openapi.json

export interface LoginResponse {
  access_token: string
  token_type: string
  role: string
  username: string
  mfa_required: boolean
}

export interface ArchiveJob {
  id: string
  filename: string
  camera_id: string
  recorded_at: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  events_found: number
  error: string | null
  created_at: string
}

export interface TotpSetup {
  secret: string
  otpauth_uri: string
  qr_svg: string
}

export interface TotpStatus {
  enabled: boolean
}

export interface MeResponse {
  sub: string
  username: string
  role: string
}

export interface UserOut {
  id: string
  username: string
  role: string
  is_active: boolean
  full_name: string | null
  email: string | null
  last_login_at: string | null
  locked: boolean
}

export interface UserCreate {
  username: string
  password: string
  role: string
  full_name?: string | null
  email?: string | null
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
  person: string | null
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
  id?: string | null
  name: string
  type: string
  polygon: [number, number][]
  rules?: Record<string, unknown>
}

// CameraOut
export interface Camera {
  id: string
  name: string
  online: boolean
  enabled: boolean
  snapshot_url: string | null
  zones: Zone[]
  analytics?: Record<string, ModuleState>
}

// состояние модуля аналитики в конфиге камеры/зоны: {enabled, ...параметры}
export type ModuleState = { enabled?: boolean } & Record<string, unknown>

// GET /api/v1/analytics/modules — каталог
export interface AnalyticsParam {
  key: string
  label: string
  type: 'bool' | 'int' | 'float' | 'text' | 'select'
  default: unknown
  min?: number
  max?: number
  options?: string[]
  unit?: string
}
export interface AnalyticsModule {
  key: string
  name: string
  category: string
  scope: 'site' | 'camera' | 'zone'
  tier: 'A' | 'B' | 'C'
  description: string
  event_type: string | null
  requires_model: string | null
  params: AnalyticsParam[]
  /** открыт ли модуль тарифом площадки; отсутствие/true = открыт */
  entitled?: boolean
}
export interface AnalyticsCatalog {
  categories: { key: string; label: string }[]
  tiers: { key: string; label: string }[]
  modules: AnalyticsModule[]
}

// AppearanceRow — один визит (вход→выход), с именем у распознанных
export interface Appearance {
  track_id: string
  camera: string
  person_id: string | null
  person_name: string | null
  watch: boolean
  category: string | null
  entered: string
  left: string
  duration_s: number
  photo_url: string | null
}
export interface AppearancesPage {
  items: Appearance[]
  total: number
}

// PersonOut
export interface Person {
  id: string
  name: string
  category: string | null
  folder_id: string | null
  position: string | null
  note: string | null
  photo_url: string | null
  photo_count: number
  seen_count: number
  watch: boolean
}

// папка-дерево для людей (напр. Школа → 5-е классы → 5-А)
export interface PersonFolder {
  id: string
  parent_id: string | null
  name: string
  count: number
}

// редактируемая категория людей (per-site)
export interface PersonCategoryRow {
  id: string
  key: string
  name: string
  is_system: boolean
}

export const PERSON_CATEGORIES = [
  'employee',
  'visitor',
  'contractor',
  'watchlist',
  'banned',
  'other',
] as const

// Турникет/СКУД (GET/POST /api/v1/turnstiles)
export interface Turnstile {
  id: string
  name: string
  camera_id: string | null
  mode: string // monitor | face_open
  connector: string // null | relay
  config: Record<string, unknown>
  enabled: boolean
}

// CameraIn
export interface CameraInput {
  id: string
  name: string
  url: string
  process_fps?: number
  detect_conf?: number
  clips_enabled?: boolean
}

// ZoneIn
export interface ZoneInput {
  name: string
  polygon: [number, number][]
  zone_intrusion?: boolean
  loitering?: boolean
  hysteresis_frames?: number
  type?: string
  dwell_s?: number
}

// PersonCreate
export interface PersonCreate {
  name: string
  track_id: string
  watch?: boolean
  note?: string
  category?: string
  position?: string
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
