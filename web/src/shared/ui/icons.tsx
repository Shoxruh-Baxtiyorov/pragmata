// Единый иконочный слой (lucide — тонкий-штриховой стиль, как Hugeicons в imaktab-front).
// Эмодзи в UI больше не используем.
import {
  AlertTriangle,
  BarChart3,
  Check,
  DoorOpen,
  LogIn,
  LogOut,
  Moon,
  MonitorPlay,
  Search,
  ShieldAlert,
  Timer,
  User,
  Users,
  Video,
  VideoOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { EventType } from '@/shared/api/types'

export const eventIcon: Record<EventType, LucideIcon> = {
  zone_intrusion: ShieldAlert,
  loitering: Timer,
  after_hours_presence: Moon,
  person_entered: LogIn,
  person_exited: LogOut,
  camera_offline: VideoOff,
  camera_online: Video,
}

export const navIcon = {
  live: MonitorPlay,
  events: BarChart3,
  stats: BarChart3,
  search: Search,
}

export {
  AlertTriangle,
  BarChart3,
  Check,
  DoorOpen,
  LogIn,
  LogOut,
  MonitorPlay,
  Moon,
  Search,
  ShieldAlert,
  Timer,
  User,
  Users,
  Video,
  VideoOff,
  X,
}
export type { LucideIcon }
