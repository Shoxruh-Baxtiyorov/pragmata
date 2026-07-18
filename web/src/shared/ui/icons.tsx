// Единый слой иконок (правило DS: иконки только отсюда, не из lucide напрямую).
// Размеры — только 16/20/24/32.
import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Camera,
  CameraOff,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Timer,
  TrendingUp,
  UserRound,
  UserRoundX,
  Video,
} from 'lucide-react'
import type { EventType } from '@/shared/lib/format'

export {
  Bot,
  Camera,
  CameraOff,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Timer,
  TrendingUp,
  UserRound,
  UserRoundX,
  Video,
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
