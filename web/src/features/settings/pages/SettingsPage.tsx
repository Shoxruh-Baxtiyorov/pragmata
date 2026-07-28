import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button, Card, Input, PageHeader, SkeletonList } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { useOrgHours, useSaveOrgHours } from '../api/settingsApi'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function SettingsPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useOrgHours()
  const save = useSaveOrgHours()

  const [enabled, setEnabled] = useState(false)
  const [days, setDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri'])
  const [open, setOpen] = useState('09:00')
  const [close, setClose] = useState('18:00')
  const [tz, setTz] = useState('Asia/Tashkent')

  // подтягиваем текущие настройки в форму
  useEffect(() => {
    if (!data) return
    setTz(data.timezone)
    const wh = data.working_hours
    setEnabled(Boolean(wh))
    if (wh) {
      setDays(wh.days)
      setOpen(wh.open)
      setClose(wh.close)
    }
  }, [data])

  const dayLabels = t('settings.dow').split(',')

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  function onSave() {
    const body = {
      timezone: tz,
      // enabled=false → пустой объект → бэкенд выключит after_hours для организации
      working_hours: enabled
        ? { days: DAY_KEYS.filter((d) => days.includes(d)), open, close }
        : {},
    }
    save.mutate(body, {
      onSuccess: () => toast.success(t('settings.saved')),
      onError: () => toast.error(t('settings.saveError')),
    })
  }

  if (isLoading) return <SkeletonList rows={3} className="h-24" />

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <Card className="space-y-5 p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 size-4 accent-[var(--color-brand-500)]"
          />
          <span>
            <span className="block text-[14px] font-semibold text-[var(--color-text-primary)]">
              {t('settings.afterHoursOn')}
            </span>
            <span className="block text-[12.5px] text-[var(--color-text-secondary)]">
              {t('settings.afterHoursHint')}
            </span>
          </span>
        </label>

        {enabled && (
          <>
            <div>
              <span className="mb-2 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                {t('settings.workDays')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_KEYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      'h-9 min-w-11 rounded-[var(--radius-md)] border px-3 text-[13px] font-semibold transition',
                      days.includes(d)
                        ? 'border-transparent bg-[var(--color-brand-500)] text-white'
                        : 'border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-500)]',
                    )}
                  >
                    {dayLabels[i] ?? d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex-1">
                <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                  {t('settings.open')}
                </span>
                <Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} />
              </label>
              <label className="flex-1">
                <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
                  {t('settings.close')}
                </span>
                <Input type="time" value={close} onChange={(e) => setClose(e.target.value)} />
              </label>
            </div>
          </>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-[var(--color-text-secondary)]">
            {t('settings.timezone')}
          </span>
          <Input value={tz} onChange={(e) => setTz(e.target.value)} />
        </label>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={onSave} loading={save.isPending}>
            {t('settings.save')}
          </Button>
          <span className="text-[12px] text-[var(--color-text-placeholder)]">
            {t('settings.applyNote')}
          </span>
        </div>
      </Card>
    </div>
  )
}
