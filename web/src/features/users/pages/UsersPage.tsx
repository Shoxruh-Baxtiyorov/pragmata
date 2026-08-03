import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  FieldLabel,
  Input,
  PageHeader,
  Select,
  SkeletonList,
} from '@/shared/ui'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { KeyRound, Plus, ShieldCheck, UserCog, UserRound, X } from '@/shared/ui/icons'
import type { UserOut } from '@/shared/api/types'
import { useCreateUser, usePatchUser, useResetPassword, useUsers } from '../api/usersApi'


function UserRow({ user }: { user: UserOut }) {
  const { t } = useTranslation()
  const patch = usePatchUser()
  const reset = useResetPassword()
  const isAdmin = user.role === 'admin'

  const toggleRole = () =>
    patch.mutate({ id: user.id, patch: { role: isAdmin ? 'user' : 'admin' } })
  const toggleActive = () =>
    patch.mutate({ id: user.id, patch: { is_active: !user.is_active } })
  const resetPassword = () => {
    const pw = window.prompt(t('users.passwordPrompt'))
    if (pw && pw.length >= 8) reset.mutate({ id: user.id, password: pw })
    else if (pw) window.alert(t('users.passwordTooShort'))
  }

  return (
    <div className="-mx-4 border-b border-[var(--color-border-soft)] px-4 transition-colors duration-[var(--dur-fast)] last:border-0 hover:bg-[var(--color-row-alt)]">
      <div className="flex flex-wrap items-center gap-3 py-3">
        {/* Роль и статус несут бейджи — иконка остаётся нейтральной */}
        <span className="text-[var(--color-text-muted)]">
          {isAdmin ? <ShieldCheck size={20} /> : <UserRound size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={user.username}>
            {user.username}
          </p>
          {user.full_name && (
            <p className="truncate text-xs text-[var(--color-text-secondary)]">{user.full_name}</p>
          )}
        </div>

        <Badge tone={isAdmin ? 'brand' : 'neutral'}>
          {isAdmin ? t('users.roleAdmin') : t('users.roleUser')}
        </Badge>
        {!user.is_active ? (
          <Badge tone="neutral">{t('users.inactive')}</Badge>
        ) : user.locked ? (
          <Badge tone="warning">{t('users.locked')}</Badge>
        ) : (
          <Badge tone="success">{t('users.active')}</Badge>
        )}

        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={toggleRole} disabled={patch.isPending}>
            {isAdmin ? t('users.makeUser') : t('users.makeAdmin')}
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleActive} disabled={patch.isPending}>
            {user.is_active ? t('users.deactivate') : t('users.activate')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetPassword}
            disabled={reset.isPending}
            aria-label={t('users.resetPassword')}
            title={t('users.resetPassword')}
          >
            <KeyRound size={16} />
          </Button>
        </div>
      </div>

      {/* Смена роли и сброс пароля падали молча — теперь ошибка видна в строке */}
      {(patch.isError || reset.isError) && (
        <ErrorNote className="mb-3">{apiErrorMessage(patch.error ?? reset.error, t)}</ErrorNote>
      )}
    </div>
  )
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const create = useCreateUser()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('user')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(
      {
        username: username.trim(),
        password,
        role,
        full_name: fullName.trim() || null,
      },
      { onSuccess: onDone },
    )
  }

  return (
    <Card className="mb-4 p-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">{t('users.add')}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDone}
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X size={16} />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <FieldLabel className="mb-1.5">{t('users.username')}</FieldLabel>
            <Input
              placeholder={t('users.username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
          <label>
            <FieldLabel className="mb-1.5">{t('users.passwordMin')}</FieldLabel>
            <Input
              type="password"
              placeholder={t('users.passwordMin')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            <FieldLabel className="mb-1.5">{t('users.fullName')}</FieldLabel>
            <Input
              placeholder={t('users.fullName')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label>
            <FieldLabel className="mb-1.5">{t('users.role')}</FieldLabel>
            <Select value={role} onChange={setRole} className="w-full">
              <option value="user">{t('users.roleUser')}</option>
              <option value="admin">{t('users.roleAdmin')}</option>
            </Select>
          </label>
        </div>

        {create.isError && <ErrorNote>{apiErrorMessage(create.error, t)}</ErrorNote>}

        <div className="flex items-center gap-2 border-t border-[var(--color-border-soft)] pt-4">
          <Button type="submit" size="sm" loading={create.isPending}>
            {t('users.create')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {t('common.close')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function UsersPage() {
  const { t } = useTranslation()
  const users = useUsers()
  const [adding, setAdding] = useState(false)

  return (
    <>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          !adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus size={16} /> {t('users.add')}
            </Button>
          )
        }
      />

      {/* Форма раньше жила в шапке и ломала её вёрстку — теперь отдельная панель */}
      {adding && <AddUserForm onDone={() => setAdding(false)} />}

      {users.isLoading ? (
        <SkeletonList rows={4} />
      ) : users.isError || !users.data ? (
        <EmptyState text={t('common.noConnection')} onRetry={() => users.refetch()} />
      ) : users.data.length === 0 ? (
        <EmptyState text={t('users.empty')} />
      ) : (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
            <UserCog size={16} className="text-[var(--color-text-muted)]" />{' '}
            {t('users.count', { count: users.data.length })}
          </div>
          <div>
            {users.data.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
