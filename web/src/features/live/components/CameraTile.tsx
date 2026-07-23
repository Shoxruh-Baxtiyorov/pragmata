import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAuthedBlob } from '@/shared/api/client'
import { Badge, Button } from '@/shared/ui'
import { Video, VideoOff } from '@/shared/ui/icons'
import { POLL } from '@/shared/lib/format'
import type { Camera } from '@/shared/api/types'

/** Снапшот перезапрашиваем сами (cache-buster), чтоб не кэшировался; поверх — зоны. */
export function CameraTile({ camera, onOpen }: { camera: Camera; onOpen: (camera: Camera) => void }) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!camera.snapshot_url) return
    let active = true
    let current: string | null = null
    const tick = () => {
      fetchAuthedBlob(camera.snapshot_url as string)
        .then((url) => {
          if (!active) return URL.revokeObjectURL(url)
          if (current) URL.revokeObjectURL(current)
          current = url
          setSrc(url)
        })
        .catch(() => {})
    }
    tick()
    const id = setInterval(tick, POLL.snapshots) // раз в секунду — живая стена
    return () => {
      active = false
      clearInterval(id)
      if (current) URL.revokeObjectURL(current)
    }
  }, [camera.snapshot_url])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(camera)}
      onKeyDown={(e) => {
        if (e.key === ' ') e.preventDefault()
        if (e.key === 'Enter' || e.key === ' ') onOpen(camera)
      }}
      className="group relative overflow-hidden rounded-card border border-border-default bg-surface text-left shadow-s transition hover:shadow-m"
    >
      <div className="relative aspect-video bg-black">
        {src ? (
          <img
            src={src}
            alt={camera.name}
            className={`h-full w-full object-cover ${camera.online ? '' : 'opacity-40 grayscale'}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-secondary">
            {camera.online ? <Video size={28} /> : <VideoOff size={28} />}
          </div>
        )}
        {/* SVG-оверлей зон: polygon в долях 0..1 → viewBox 0..100 */}
        {camera.zones.length > 0 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            {camera.zones.map((z) => (
              <polygon
                key={z.name}
                points={z.polygon.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                fill="color-mix(in srgb, var(--color-brand) 15%, transparent)"
                stroke="var(--color-error)"
                strokeWidth="0.6"
              />
            ))}
          </svg>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="min-w-0 truncate text-body font-semibold text-text-primary" title={camera.name}>
          {camera.name}
        </span>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge tone={camera.online ? 'success' : 'error'}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
            {camera.online ? t('live.online') : t('live.offline')}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              nav(`/events?camera_id=${camera.id}`)
            }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {t('nav.events')}
          </Button>
        </div>
      </div>
    </div>
  )
}
