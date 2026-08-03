import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAuthedBlob } from '@/shared/api/client'
import { Badge, Button, Modal, Spinner } from '@/shared/ui'
import { VideoOff } from '@/shared/ui/icons'
import type { Camera } from '@/shared/api/types'
import { ZoneOverlay } from './ZoneOverlay'

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
      <div className="flex items-start justify-between gap-2 pr-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2
            className="min-w-0 truncate text-base font-bold text-[var(--color-text-primary)]"
            title={camera.name}
          >
            {camera.name}
          </h2>
          <Badge tone={camera.online ? 'success' : 'error'}>
            <span className="size-1.5 rounded-full bg-current" />
            {camera.online ? t('live.online') : t('live.offline')}
          </Badge>
        </div>
      </div>

      <div className="relative mt-4 aspect-video overflow-hidden rounded-[var(--radius-lg)] bg-black">
        {src ? (
          <img
            src={src}
            alt={camera.name}
            decoding="async"
            className={`h-full w-full object-cover ${camera.online ? '' : 'opacity-40 grayscale'}`}
          />
        ) : (
          // Пока не пришёл первый кадр: спиннер для живой камеры, знак «нет
          // сигнала» для отключённой — состояние читается без подписи.
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
            {camera.online ? <Spinner /> : <VideoOff size={32} />}
          </div>
        )}
        <ZoneOverlay zones={camera.zones} />
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={() => nav(`/events?camera_id=${camera.id}`)}>
          {t('nav.events')}
        </Button>
      </div>
    </Modal>
  )
}
