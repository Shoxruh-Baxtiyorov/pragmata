import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, setBackendStatusHandlers } from '@/shared/api/client'

const POLL_MS = 8000 // фоновый пинг health, пока всё ок и пока «лежит»

/**
 * Полноэкранный экран «технический перерыв», когда бэкенд недоступен (ноут/ngrok/
 * сервер упал или нет сети). Два источника сигнала:
 *  - мгновенно: любой api-запрос упал по сети → показываем сразу;
 *  - фоново: пинг /api/v1/health каждые 8с — ловит падение без активности юзера
 *    и сам убирает экран, когда бэкенд вернулся.
 */
export function TechBreak() {
  const { t } = useTranslation()
  const [down, setDown] = useState(false)

  useEffect(() => {
    setBackendStatusHandlers(
      () => setDown(true),
      () => setDown(false),
    )
  }, [])

  useEffect(() => {
    let alive = true
    const ping = async () => {
      const ctrl = new AbortController()
      const to = setTimeout(() => ctrl.abort(), 5000)
      try {
        const res = await fetch(api.url('/api/v1/health'), {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: ctrl.signal,
        })
        if (alive) setDown(!res.ok)
      } catch {
        if (alive) setDown(true)
      } finally {
        clearTimeout(to)
      }
    }
    void ping()
    const id = setInterval(() => void ping(), POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (!down) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-bg-app)] px-6">
      <div className="flex max-w-md flex-col items-center gap-5 text-center">
        <span className="size-10 animate-spin rounded-full border-4 border-[var(--color-border-strong)] border-t-[var(--color-brand-500)]" />
        <h1 className="text-[24px] font-extrabold text-[var(--color-text-primary)]">
          {t('techbreak.title')}
        </h1>
        <p className="text-[14.5px] text-[var(--color-text-secondary)]">{t('techbreak.subtitle')}</p>
      </div>
    </div>
  )
}
