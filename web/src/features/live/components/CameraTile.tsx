import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAuthedBlob } from '@/shared/api/client'
import { StatusBadge } from '@/shared/ui'
import { Video, VideoOff } from '@/shared/ui/icons'
import type { Camera } from '@/shared/api/types'

/** Снапшот перезапрашиваем сами (cache-buster), чтоб не кэшировался; поверх — зоны. */
export function CameraTile({ camera, onClick }: { camera: Camera; onClick: () => void }) {
  const { t } = useTranslation()
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
    const id = setInterval(tick, 3000)
    return () => {
      active = false
      clearInterval(id)
      if (current) URL.revokeObjectURL(current)
    }
  }, [camera.snapshot_url])

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-white text-left shadow-[var(--shadow-xs)] transition hover:shadow-[var(--shadow-sm)]"
    >
      <div className="relative aspect-video bg-black">
        {src ? (
          <img
            src={src}
            alt={camera.name}
            className={`h-full w-full object-cover ${camera.online ? '' : 'opacity-40 grayscale'}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-neutral-500)]">
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
                fill="rgba(248,40,90,0.15)"
                stroke="var(--color-danger-500)"
                strokeWidth="0.6"
              />
            ))}
          </svg>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="min-w-0 truncate text-sm font-bold text-[var(--color-text-primary)]" title={camera.name}>
          {camera.name}
        </span>
        <StatusBadge tone={camera.online ? 'success' : 'error'}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
          {camera.online ? t('live.online') : t('live.offline')}
        </StatusBadge>
      </div>
    </button>
  )
}
