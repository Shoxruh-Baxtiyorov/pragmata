import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  FieldLabel,
  Input,
  PageHeader,
  Skeleton,
} from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { ShieldCheck } from '@/shared/ui/icons'
import { ChangePassword } from '../components/ChangePassword'
import type { TotpSetup } from '@/shared/api/types'
import {
  useDisableTotp,
  useEnableTotp,
  useTotpSetup,
  useTotpStatus,
} from '../api/securityApi'

function EnableFlow() {
  const { t } = useTranslation()
  const setup = useTotpSetup()
  const enable = useEnableTotp()
  const [data, setData] = useState<TotpSetup | null>(null)
  const [code, setCode] = useState('')

  if (!data)
    return (
      <div className="flex flex-col items-start gap-3">
        {/* Состояние 2FA раньше читалось только по кнопке — теперь есть явный статус */}
        <Badge tone="neutral">{t('system.off')}</Badge>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('security.2faOffHint')}</p>
        <Button loading={setup.isPending} onClick={() => setup.mutate(undefined, { onSuccess: setData })}>
          {t('security.enable')}
        </Button>
        {setup.isError && <ErrorNote>{apiErrorMessage(setup.error, t)}</ErrorNote>}
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-text-secondary)]">{t('security.scanHint')}</p>
      <div className="flex flex-wrap items-start gap-4">
        <img
          src={data.qr_svg}
          alt="QR"
          className="size-44 rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-white p-2"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <FieldLabel>{t('security.manualKey')}</FieldLabel>
          <code className="select-all break-all rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-text-primary)]">
            {data.secret}
          </code>
        </div>
      </div>
      <form
        className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-soft)] pt-4"
        onSubmit={(e) => {
          e.preventDefault()
          enable.mutate(code.trim(), { onSuccess: () => setData(null) })
        }}
      >
        <Input
          className="w-40"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t('login.code')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={enable.isError || undefined}
          autoFocus
        />
        <Button type="submit" loading={enable.isPending}>
          {t('security.confirm')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setData(null)}>
          {t('common.close')}
        </Button>
        {enable.isError && <ErrorNote className="w-full">{t('login.codeError')}</ErrorNote>}
      </form>
    </div>
  )
}

function DisableFlow() {
  const { t } = useTranslation()
  const disable = useDisableTotp()
  const [code, setCode] = useState('')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge tone="success">
          <ShieldCheck size={16} /> {t('security.2faOn')}
        </Badge>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">{t('security.2faOnHint')}</p>
      <form
        className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-soft)] pt-4"
        onSubmit={(e) => {
          e.preventDefault()
          disable.mutate(code.trim(), { onSuccess: () => setCode('') })
        }}
      >
        <Input
          className="w-40"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t('login.code')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={disable.isError || undefined}
        />
        <Button type="submit" variant="destructive" loading={disable.isPending}>
          {t('security.disable')}
        </Button>
        {disable.isError && <ErrorNote className="w-full">{t('login.codeError')}</ErrorNote>}
      </form>
    </div>
  )
}

export function SecurityPage() {
  const { t } = useTranslation()
  const status = useTotpStatus()

  return (
    <div className="max-w-2xl">
      <PageHeader title={t('security.title')} subtitle={t('security.subtitle')} />

      <div className="flex flex-col gap-4">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
            <ShieldCheck size={20} className="text-[var(--color-text-muted)]" />{' '}
            {t('security.2faTitle')}
          </h2>
          {status.isLoading ? (
            <Skeleton className="h-40" />
          ) : status.isError ? (
            <ErrorNote>
              {status.error instanceof ApiError && status.error.status === 400
                ? t('security.notForBreakGlass')
                : t('common.noConnection')}
            </ErrorNote>
          ) : status.data?.enabled ? (
            <DisableFlow />
          ) : (
            <EnableFlow />
          )}
        </Card>

        <ChangePassword />
      </div>
    </div>
  )
}
