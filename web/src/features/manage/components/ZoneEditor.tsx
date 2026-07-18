import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input, Modal } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { X } from '@/shared/ui/icons'
import type { Camera } from '@/shared/api/types'
import { useAddZone } from '../api/manageApi'

type ContentRect = { left: number; top: number; width: number; height: number }

// Прямоугольник реально отображаемого кадра внутри контейнера при object-contain
// (леттербоксинг по бокам/сверху-снизу, если пропорции кадра ≠ пропорциям контейнера)
function getContentRect(box: HTMLElement, img: HTMLImageElement): ContentRect | null {
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (!nw || !nh) return null
  const cw = box.clientWidth
  const ch = box.clientHeight
  const scale = Math.min(cw / nw, ch / nh)
  const w = nw * scale
  const h = nh * scale
  return { left: (cw - w) / 2, top: (ch - h) / 2, width: w, height: h }
}

/** Клики по снапшоту → полигон в долях 0..1, затем правило + сохранение в БД. */
export function ZoneEditor({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const { t } = useTranslation()
  const snap = useAuthedMedia(camera.snapshot_url)
  const addZone = useAddZone()
  const boxRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [rect, setRect] = useState<ContentRect | null>(null)
  const [points, setPoints] = useState<[number, number][]>([])
  const [name, setName] = useState('')
  const [loitering, setLoitering] = useState(false)

  function updateRect() {
    const box = boxRef.current
    const img = imgRef.current
    if (!box || !img) return
    setRect(getContentRect(box, img))
  }

  useEffect(() => {
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [])

  // почему contain, а не cover (зоны в координатах реального кадра — rules/engine.py масштабирует на w,h кадра)
  function onClick(e: MouseEvent) {
    const box = boxRef.current
    const img = imgRef.current
    if (!box || !img) return
    const content = getContentRect(box, img)
    if (!content || content.width === 0 || content.height === 0) return
    const boxRectPx = box.getBoundingClientRect()
    const clickX = e.clientX - boxRectPx.left
    const clickY = e.clientY - boxRectPx.top
    const inside =
      clickX >= content.left &&
      clickX <= content.left + content.width &&
      clickY >= content.top &&
      clickY <= content.top + content.height
    if (!inside) return
    const x = Math.min(1, Math.max(0, (clickX - content.left) / content.width))
    const y = Math.min(1, Math.max(0, (clickY - content.top) / content.height))
    setPoints((p) => [...p, [Number(x.toFixed(3)), Number(y.toFixed(3))]])
  }

  function save() {
    if (points.length < 3) return
    addZone.mutate(
      {
        cameraId: camera.id,
        zone: {
          name: name.trim() || t('manage.zoneName'),
          polygon: points,
          zone_intrusion: true,
          loitering,
          hysteresis_frames: 6,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-h3 text-text-primary">{t('manage.drawZone')}</h2>
          <p className="truncate text-body text-text-secondary" title={camera.name}>
            {camera.name} · {t('manage.zoneHint')}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-card p-1.5 text-text-secondary hover:bg-bg-secondary"
        >
          <X size={20} />
        </button>
      </div>

      <div
        ref={boxRef}
        onClick={onClick}
        className="relative mt-4 aspect-video cursor-crosshair select-none overflow-hidden rounded-card bg-black"
      >
        {snap && (
          <img
            ref={imgRef}
            src={snap}
            alt=""
            onLoad={updateRect}
            className="pointer-events-none h-full w-full object-contain"
            draggable={false}
          />
        )}
        {rect && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          >
            {points.length >= 3 && (
              <polygon
                points={points.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                fill="color-mix(in srgb, var(--color-brand) 20%, transparent)"
                stroke="var(--color-brand)"
                strokeWidth="0.6"
              />
            )}
            {points.length > 0 && points.length < 3 && (
              <polyline
                points={points.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="0.6"
              />
            )}
            {points.map(([x, y], i) => (
              <circle key={i} cx={x * 100} cy={y * 100} r="1.2" fill="var(--color-brand)" />
            ))}
          </svg>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('manage.zoneName')}
          className="h-9 w-40"
        />
        <label className="flex items-center gap-1.5 text-label text-text-secondary">
          <input type="checkbox" checked={loitering} onChange={(e) => setLoitering(e.target.checked)} />
          {t('manage.loitering')}
        </label>
        <span className="text-label text-text-secondary">
          {t('manage.points')}: {points.length}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setPoints([])}>
          {t('manage.reset')}
        </Button>
        <Button size="sm" disabled={points.length < 3 || addZone.isPending} onClick={save}>
          {t('manage.save')}
        </Button>
      </div>
    </Modal>
  )
}
