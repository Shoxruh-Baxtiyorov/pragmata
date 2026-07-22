import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Input, PageHeader, Skeleton } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
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
        <p className="text-body text-text-secondary">{t('security.2faOffHint')}</p>
        <Button loading={setup.isPending} onClick={() => setup.mutate(undefined, { onSuccess: setData })}>
          {t('security.enable')}
        </Button>
        {setup.isError && (
          <p className="text-label text-error">
            {setup.error instanceof ApiError ? setup.error.message : t('common.noConnection')}
          </p>
        )}
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-text-secondary">{t('security.scanHint')}</p>
      <div className="flex flex-wrap items-start gap-4">
        <img
          src={data.qr_svg}
          alt="QR"
          className="size-44 rounded-card border border-border-default bg-white p-2"
        />
        <div className="flex flex-col gap-1">
          <span className="text-label text-text-secondary">{t('security.manualKey')}</span>
          <code className="select-all break-all rounded-input bg-bg-secondary px-2 py-1 font-mono text-label">
            {data.secret}
          </code>
        </div>
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
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
        {enable.isError && <p className="w-full text-label text-error">{t('login.codeError')}</p>}
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
          <ShieldCheck size={14} /> {t('security.2faOn')}
        </Badge>
      </div>
      <p className="text-body text-text-secondary">{t('security.2faOnHint')}</p>
      <form
        className="flex flex-wrap items-center gap-2"
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
        {disable.isError && <p className="w-full text-label text-error">{t('login.codeError')}</p>}
      </form>
    </div>
  )
}

export function SecurityPage() {
  const { t } = useTranslation()
  const status = useTotpStatus()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t('security.title')} subtitle={t('security.subtitle')} />
      <Card className="max-w-2xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-h3">
          <ShieldCheck size={20} className="text-brand" /> {t('security.2faTitle')}
        </h2>
        {status.isLoading ? (
          <Skeleton className="h-40" />
        ) : status.isError ? (
          <p className="text-label text-error">
            {status.error instanceof ApiError && status.error.status === 400
              ? t('security.notForBreakGlass')
              : t('common.noConnection')}
          </p>
        ) : status.data?.enabled ? (
          <DisableFlow />
        ) : (
          <EnableFlow />
        )}
      </Card>

      <ChangePassword />
    </div>
  )
}
