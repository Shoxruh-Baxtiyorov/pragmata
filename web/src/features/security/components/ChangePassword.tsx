import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, ErrorNote, FieldLabel, Input } from '@/shared/ui'
import { apiErrorMessage } from '@/shared/lib/apiError'
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
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
        <KeyRound size={20} className="text-[var(--color-text-muted)]" /> {t('security.passwordTitle')}
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>{t('security.newPassword')}</FieldLabel>
          <Input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setDone(false)
            }}
            autoComplete="new-password"
            aria-invalid={tooShort || undefined}
            className="max-w-sm"
          />
          {tooShort && (
            <span className="text-xs font-medium text-[var(--color-error-text)]">
              {t('security.passwordShort')}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel>{t('security.repeatPassword')}</FieldLabel>
          <Input
            type="password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
            className="max-w-sm"
          />
          {mismatch && (
            <span className="text-xs font-medium text-[var(--color-error-text)]">
              {t('security.passwordMismatch')}
            </span>
          )}
        </label>

        {change.isError && <ErrorNote>{apiErrorMessage(change.error, t)}</ErrorNote>}

        <div className="flex items-center gap-3 border-t border-[var(--color-border-soft)] pt-4">
          <Button type="submit" disabled={!canSubmit} loading={change.isPending}>
            {t('security.changePassword')}
          </Button>
          {done && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-success-text)]">
              <Check size={16} /> {t('security.passwordChanged')}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}
