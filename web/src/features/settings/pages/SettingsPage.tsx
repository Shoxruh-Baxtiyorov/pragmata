import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Button,
  Card,
  EmptyState,
  FieldLabel,
  Input,
  PageHeader,
  SkeletonList,
} from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { useOrgHours, useSaveOrgHours } from '../api/settingsApi'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const


export function SettingsPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useOrgHours()
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

  if (isLoading)
    return (
      <div className="max-w-2xl">
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
        <SkeletonList rows={3} className="h-24" />
      </div>
    )

  // Раньше сбой загрузки молча показывал форму с дефолтами — юзер сохранял
  // «09:00–18:00», не зная, что настоящие настройки не доехали.
  if (isError)
    return (
      <div className="max-w-2xl">
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
        <EmptyState text={t('common.noConnection')} onRetry={() => void refetch()} />
      </div>
    )

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {/* Card кита — flex-колонка с gap-4; всё содержимое в одном ребёнке,
          иначе gap и собственные отступы секций складываются */}
      <Card className="p-5">
        <div className="space-y-5">
          <label className="-mx-2 flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] px-2 py-1.5 transition-colors duration-[var(--dur-fast)] hover:bg-[var(--color-row-alt)]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-brand-500)]"
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
                {t('settings.afterHoursOn')}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">
                {t('settings.afterHoursHint')}
              </span>
            </span>
          </label>

          {enabled && (
            <div className="space-y-5 border-t border-[var(--color-border-soft)] pt-5">
              <div>
                <FieldLabel className="mb-1.5">{t('settings.workDays')}</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_KEYS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={days.includes(d)}
                      onClick={() => toggleDay(d)}
                      className={cn(
                        'h-9 min-w-11 rounded-[var(--radius-md)] border px-3 text-xs font-bold transition-all duration-[var(--dur-fast)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] active:translate-y-px',
                        days.includes(d)
                          ? 'border-transparent bg-[var(--color-brand-500)] text-white shadow-[var(--shadow-brand)]'
                          : 'border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-500)] hover:text-[var(--color-text-primary)]',
                      )}
                    >
                      {dayLabels[i] ?? d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="min-w-36 flex-1">
                  <FieldLabel className="mb-1.5">{t('settings.open')}</FieldLabel>
                  <Input type="time" value={open} onChange={(e) => setOpen(e.target.value)} />
                </label>
                <label className="min-w-36 flex-1">
                  <FieldLabel className="mb-1.5">{t('settings.close')}</FieldLabel>
                  <Input type="time" value={close} onChange={(e) => setClose(e.target.value)} />
                </label>
              </div>
            </div>
          )}

          <label className="block border-t border-[var(--color-border-soft)] pt-5">
            <FieldLabel className="mb-1.5">{t('settings.timezone')}</FieldLabel>
            <Input value={tz} onChange={(e) => setTz(e.target.value)} />
          </label>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-soft)] pt-5">
            <Button onClick={onSave} loading={save.isPending}>
              {t('settings.save')}
            </Button>
            <span className="text-xs text-[var(--color-text-muted)]">{t('settings.applyNote')}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
