import { useState, type FormEvent } from 'react'
import { KeyRound, Lock, Plus, ShieldCheck, ShieldOff, UserRound } from 'lucide-react'
import { api, ApiError, type UserOut } from '../api'
import { useFetch } from '../hooks'
import { Badge, Button, Card, Field, Input, Select } from '../ui'
import { PageState } from './state'

function UserRow({ user, reload }: { user: UserOut; reload: () => void }) {
  const [busy, setBusy] = useState(false)
  const isAdmin = user.role === 'admin'

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      reload()
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : 'Ошибка')
    } finally {
      setBusy(false)
    }
  }

  const toggleRole = () =>
    run(() => api.patch(`/api/v1/users/${user.id}`, { role: isAdmin ? 'user' : 'admin' }))
  const toggleActive = () =>
    run(() => api.patch(`/api/v1/users/${user.id}`, { is_active: !user.is_active }))
  const resetPassword = () => {
    const pw = window.prompt('Новый пароль (минимум 8 символов):')
    if (!pw) return
    if (pw.length < 8) return window.alert('Пароль минимум 8 символов')
    run(() => api.post(`/api/v1/users/${user.id}/password`, { new_password: pw }))
  }
  const reset2fa = () => {
    if (window.confirm(`Снять 2FA у «${user.username}»? Юзер сможет войти без кода.`))
      run(() => api.post(`/api/v1/backoffice/users/${user.id}/2fa/reset`))
  }
  const unlock = () => run(() => api.post(`/api/v1/backoffice/users/${user.id}/unlock`))

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

      <Badge tone={isAdmin ? 'brand' : 'neutral'}>{isAdmin ? 'админ' : 'юзер'}</Badge>
      {!user.is_active ? (
        <Badge tone="neutral">неактивен</Badge>
      ) : user.locked ? (
        <Badge tone="warning">заблокирован</Badge>
      ) : (
        <Badge tone="success">активен</Badge>
      )}

      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={toggleRole} disabled={busy}>
          {isAdmin ? 'снять админа' : 'сделать админом'}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleActive} disabled={busy}>
          {user.is_active ? 'деактивировать' : 'активировать'}
        </Button>
        {user.locked && (
          <Button variant="ghost" size="icon" onClick={unlock} disabled={busy} title="Снять локаут">
            <Lock size={18} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={reset2fa}
          disabled={busy}
          title="Сбросить 2FA"
        >
          <ShieldOff size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetPassword}
          disabled={busy}
          title="Сбросить пароль"
        >
          <KeyRound size={18} />
        </Button>
      </div>
    </div>
  )
}

function AddUser({ reload }: { reload: () => void }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('user')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/api/v1/users', {
        username: username.trim(),
        password,
        role,
        full_name: fullName.trim() || null,
      })
      setUsername('')
      setPassword('')
      setFullName('')
      setRole('user')
      setOpen(false)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка создания')
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> Добавить
      </Button>
    )

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Field label="Логин">
        <Input
          className="w-36"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Пароль (8+)">
        <Input
          className="w-40"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </Field>
      <Field label="Имя">
        <Input className="w-36" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <Field label="Роль">
        <Select value={role} onChange={setRole}>
          <option value="user">юзер</option>
          <option value="admin">админ</option>
        </Select>
      </Field>
      <Button type="submit" size="sm" loading={busy}>
        Создать
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Отмена
      </Button>
      {error && <p className="w-full text-label text-error">{error}</p>}
    </form>
  )
}

export function Access() {
  const q = useFetch<UserOut[]>(() => api.get('/api/v1/users'))

  return (
    <PageState loading={q.loading} error={q.error} reload={q.reload}>
      {q.data && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <AddUser reload={q.reload} />
          </div>
          <Card className="p-4">
            {q.data.map((u) => (
              <UserRow key={u.id} user={u} reload={q.reload} />
            ))}
          </Card>
        </div>
      )}
    </PageState>
  )
}
