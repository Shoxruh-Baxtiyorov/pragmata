/**
 * Deterministic name → avatar colour.
 *
 * Maps any name string to one vivid colour from a curated, evenly-spread
 * palette so each person/entity gets a stable, distinct avatar tint (the
 * colourful initials-tiles look). White foreground keeps the bold initials
 * readable on every swatch. The hash is order-stable so the same name always
 * lands on the same colour across pages and reloads.
 */

// iqbola avatar/category palette. Values are token references so theme changes
// keep avatars on the same visual system as badges, charts, and categories.
const AVATAR_PALETTE = [
  'var(--color-brand-500)',
  'var(--color-success-500)',
  'var(--color-violet-500)',
  'var(--color-warning-500)',
  'var(--color-info-500)',
  'var(--color-danger-500)',
  'var(--color-subject-orange)',
  'var(--color-neutral-600)',
] as const

export interface AvatarColor {
  bg: string
  fg: string
}

export function avatarColor(name: string | null | undefined): AvatarColor {
  const key = (name ?? '').trim()
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return { bg: AVATAR_PALETTE[hash % AVATAR_PALETTE.length], fg: '#ffffff' }
}
