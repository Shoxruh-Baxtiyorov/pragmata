import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { useToast } from '@/shared/ui/toast'
import { X } from '@/shared/ui/icons'
import type { Camera } from '@/shared/api/types'
import { useAddZone } from '../api/manageApi'

/** Клики по снапшоту → полигон в долях 0..1. Затем правило + сохранение в БД. */
export function ZoneEditor({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const { t } = useTranslation()
  const snap = useAuthedMedia(camera.snapshot_url)
  const toast = useToast()
  const addZone = useAddZone()
  const boxRef = useRef<HTMLDivElement>(null)
  const [points, setPoints] = useState<[number, number][]>([])
  const [name, setName] = useState('Зона')
  const [loitering, setLoitering] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function onClick(e: React.MouseEvent) {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    const x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
    const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height))
    setPoints((p) => [...p, [Number(x.toFixed(3)), Number(y.toFixed(3))]])
  }

  function save() {
    if (points.length < 3) return
    addZone.mutate(
      {
        cameraId: camera.id,
        zone: { name, polygon: points, zone_intrusion: true, loitering, hysteresis_frames: 6 },
      },
      {
        onSuccess: () => {
          toast(t('manage.zoneSaved'), 'ok')
          onClose()
        },
        onError: () => toast('Ошибка', 'error'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-neutral-900)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-modal)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] p-4">
          <div>
            <p className="font-heading font-bold">{t('manage.drawZone')}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{camera.name} · {t('manage.zoneHint')}</p>
          </div>
          <button onClick={onClose} className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <div ref={boxRef} onClick={onClick} className="relative aspect-video cursor-crosshair overflow-hidden rounded-[var(--radius-lg)] bg-black select-none">
            {snap && <img src={snap} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              {points.length >= 3 && (
                <polygon points={points.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')} fill="rgba(47,107,255,0.2)" stroke="var(--color-brand-500)" strokeWidth="0.6" />
              )}
              {points.length > 0 && points.length < 3 && (
                <polyline points={points.map(([x, y]) => `${x * 100},${y * 100}`).join(' ')} fill="none" stroke="var(--color-brand-500)" strokeWidth="0.6" />
              )}
              {points.map(([x, y], i) => (
                <circle key={i} cx={x * 100} cy={y * 100} r="1.2" fill="var(--color-brand-600)" />
              ))}
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('manage.zoneName')} className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3 text-sm focus:border-[var(--color-brand-500)] focus:outline-none" />
            <label className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={loitering} onChange={(e) => setLoitering(e.target.checked)} />
              {t('manage.loitering')}
            </label>
            <span className="text-sm text-[var(--color-text-muted)]">{t('manage.points')}: {points.length}</span>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setPoints([])}>{t('manage.reset')}</Button>
            <Button size="sm" disabled={points.length < 3 || addZone.isPending} onClick={save}>{t('manage.save')}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
