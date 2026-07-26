import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { avatarColor } from '@/shared/lib/avatarColor'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  src?: string
  name: string
  size?: AvatarSize
  className?: string
}

const AVATAR_PX: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 42, lg: 52, xl: 72 }

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [errored, setErrored] = useState(false)
  const px = AVATAR_PX[size]
  const showImage = src && !errored
  const tint = avatarColor(name)

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center overflow-hidden select-none shrink-0 font-bold',
        className,
      )}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        fontSize: Math.max(11, Math.round(px * 0.34)),
        backgroundColor: tint.bg,
        color: tint.fg,
      }}
      aria-label={name}
      role="img"
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          width={px}
          height={px}
          onError={() => setErrored(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )
}
Avatar.displayName = 'Avatar'
