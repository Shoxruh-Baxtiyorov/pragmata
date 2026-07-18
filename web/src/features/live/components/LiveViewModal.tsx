import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAuthedBlob } from '@/shared/api/client'
import { Badge, Button, Modal } from '@/shared/ui'
import { Video, VideoOff, X } from '@/shared/ui/icons'
import type { Camera } from '@/shared/api/types'

/** Живой просмотр: тот же приём, что и в CameraTile, но с интервалом 1с (псевдо-live). */
export function LiveViewModal({ camera, onClose }: { camera: Camera; onClose: () => void }) {
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
    const id = setInterval(tick, 1000)
    return () => {
      active = false
      clearInterval(id)
      if (current) URL.revokeObjectURL(current)
    }
  }, [camera.snapshot_url])

  return (
    <Modal onClose={onClose} className="max-w-3xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="min-w-0 truncate text-h3 text-text-primary" title={camera.name}>
            {camera.name}
          </h2>
          <Badge tone={camera.online ? 'success' : 'error'}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor' }} />
            {camera.online ? t('live.online') : t('live.offline')}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-card p-1.5 text-text-secondary hover:bg-bg-secondary"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative mt-4 aspect-video overflow-hidden rounded-card bg-black">
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

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={() => nav(`/events?camera_id=${camera.id}`)}>
          {t('nav.events')}
        </Button>
      </div>
    </Modal>
  )
}
