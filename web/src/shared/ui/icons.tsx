// Единый слой иконок (правило DS: иконки только отсюда, не из lucide напрямую).
// Размеры — только 16/20/24/32.
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Bot,
  Camera,
  CameraOff,
  Check,
  Cpu,
  Database,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  MapPin,
  MonitorPlay,
  Moon,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  TrendingUp,
  UserRound,
  UserRoundX,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react'
import type { EventType } from '@/shared/lib/format'

export {
  AlertTriangle,
  Bot,
  Camera,
  CameraOff,
  Check,
  Cpu,
  Database,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  MapPin,
  MonitorPlay,
  Moon,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  TrendingUp,
  UserRound,
  UserRoundX,
  Users,
  Video,
  VideoOff,
  X,
}
export type { LucideIcon }

export const ICON_SIZE = { sm: 16, md: 20, lg: 24, xl: 32 } as const

export const eventIcon: Record<EventType, LucideIcon> = {
  zone_intrusion: ShieldAlert,
  loitering: Timer,
  after_hours_presence: Moon,
  person_entered: UserRound,
  person_exited: UserRoundX,
  camera_offline: CameraOff,
  camera_online: Camera,
}
