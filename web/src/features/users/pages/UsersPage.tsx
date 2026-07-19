import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { KeyRound, Plus, ShieldCheck, UserCog, UserRound } from '@/shared/ui/icons'
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
    <div className="flex flex-wrap items-center gap-3 border-b border-border-default py-3 last:border-0">
      <span className={isAdmin ? 'text-brand' : 'text-text-secondary'}>
        {isAdmin ? <ShieldCheck size={20} /> : <UserRound size={20} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold" title={user.username}>
          {user.username}
        </p>
        {user.full_name && (
          <p className="truncate text-label text-text-secondary">{user.full_name}</p>
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
          aria-label={t('users.resetPassword')}
          title={t('users.resetPassword')}
        >
          <KeyRound size={18} />
        </Button>
      </div>
    </div>
  )
}

function AddUserForm() {
  const { t } = useTranslation()
  const create = useCreateUser()
  const [open, setOpen] = useState(false)
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
      {
        onSuccess: () => {
          setUsername('')
          setPassword('')
          setFullName('')
          setRole('user')
          setOpen(false)
        },
      },
    )
  }

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> {t('users.add')}
      </Button>
    )

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-40"
          placeholder={t('users.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          required
        />
        <Input
          className="w-44"
          type="password"
          placeholder={t('users.passwordMin')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
        <Input
          className="w-40"
          placeholder={t('users.fullName')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Select value={role} onChange={setRole}>
          <option value="user">{t('users.roleUser')}</option>
          <option value="admin">{t('users.roleAdmin')}</option>
        </Select>
        <Button type="submit" size="sm" loading={create.isPending}>
          {t('users.create')}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t('common.close')}
        </Button>
      </div>
      {create.isError && (
        <p className="text-label text-error">
          {create.error instanceof ApiError ? create.error.message : t('users.createError')}
        </p>
      )}
    </form>
  )
}

export function UsersPage() {
  const { t } = useTranslation()
  const users = useUsers()

  return (
    <>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={<AddUserForm />}
      />

      {users.isLoading ? (
        <Spinner />
      ) : users.isError || !users.data ? (
        <EmptyState text={t('common.noConnection')} onRetry={() => users.refetch()} />
      ) : users.data.length === 0 ? (
        <EmptyState text={t('users.empty')} />
      ) : (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-label text-text-secondary">
            <UserCog size={16} /> {t('users.count', { count: users.data.length })}
          </div>
          {users.data.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </Card>
      )}
    </>
  )
}
