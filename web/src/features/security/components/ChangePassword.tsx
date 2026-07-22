import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { Check, KeyRound } from '@/shared/ui/icons'
import { useChangeOwnPassword } from '../api/securityApi'

const MIN = 8

/**
 * Свой пароль до сих пор было негде сменить: эндпоинт /me/password есть,
 * а UI не было — сбросить пароль мог только админ из бэкофиса.
 */
export function ChangePassword() {
  const { t } = useTranslation()
  const change = useChangeOwnPassword()
  const [pw, setPw] = useState('')
  const [repeat, setRepeat] = useState('')
  const [done, setDone] = useState(false)

  const tooShort = pw.length > 0 && pw.length < MIN
  const mismatch = repeat.length > 0 && pw !== repeat
  const canSubmit = pw.length >= MIN && pw === repeat && !change.isPending

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setDone(false)
    change.mutate(pw, {
      onSuccess: () => {
        setPw('')
        setRepeat('')
        setDone(true)
      },
    })
  }

  return (
    <Card className="max-w-2xl p-6">
      <h2 className="mb-4 flex items-center gap-2 text-h3">
        <KeyRound size={20} className="text-brand" /> {t('security.passwordTitle')}
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-label font-semibold text-text-secondary">
            {t('security.newPassword')}
          </span>
          <Input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setDone(false)
            }}
            autoComplete="new-password"
            className="max-w-sm"
          />
          {tooShort && (
            <span className="text-caption text-error">{t('security.passwordShort')}</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label font-semibold text-text-secondary">
            {t('security.repeatPassword')}
          </span>
          <Input
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            autoComplete="new-password"
            className="max-w-sm"
          />
          {mismatch && (
            <span className="text-caption text-error">{t('security.passwordMismatch')}</span>
          )}
        </label>

        {change.isError && (
          <p className="text-label text-error">
            {change.error instanceof ApiError ? change.error.message : t('common.noConnection')}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit} loading={change.isPending}>
            {t('security.changePassword')}
          </Button>
          {done && (
            <span className="inline-flex items-center gap-1.5 text-label text-success">
              <Check size={16} /> {t('security.passwordChanged')}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
