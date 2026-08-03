import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAuthedBlob } from '@/shared/api/client'
import { Badge, Button } from '@/shared/ui'
import { Video, VideoOff } from '@/shared/ui/icons'
import { POLL } from '@/shared/lib/format'
import type { Camera } from '@/shared/api/types'
import { ZoneOverlay } from './ZoneOverlay'

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
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] text-left shadow-[var(--shadow-xs)] outline-none transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]"
    >
      <div className="relative aspect-video bg-black">
        {src ? (
          <img
            src={src}
            alt={camera.name}
            decoding="async"
            className={`h-full w-full object-cover ${camera.online ? '' : 'opacity-40 grayscale'}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
            {camera.online ? <Video size={32} /> : <VideoOff size={32} />}
          </div>
        )}
        <ZoneOverlay zones={camera.zones} />
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text-primary)]" title={camera.name}>
          {camera.name}
        </span>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge tone={camera.online ? 'success' : 'error'}>
            <span className="size-1.5 rounded-full bg-current" />
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
