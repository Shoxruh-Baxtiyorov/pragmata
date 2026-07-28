import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AppPage } from '@/shared/ui/layout/AppPage'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Input,
  Label,
  ResponsiveTable,
  StatusBadge,
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui'
import { KeyRound, Lock, Plus, ShieldCheck, Shield, User } from '@/shared/ui/icons'
import { ApiError } from '@/api/client'
import {
  useCreateUser,
  usePatchUser,
  useSites,
  useUserAction,
  useUsers,
  type UserRow,
} from '@/api/queries'

function Row({ u, siteName }: { u: UserRow; siteName: string | null }) {
  const patch = usePatchUser()
  const action = useUserAction()
  const isAdmin = u.role === 'admin'
  const busy = patch.isPending || action.isPending

  const run = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast.success(ok)).catch((e) => toast.error(e instanceof ApiError ? e.message : 'Ошибка'))

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className={isAdmin ? 'text-[var(--color-brand-500)]' : 'text-[var(--color-text-muted)]'}>
            {isAdmin ? <ShieldCheck size={18} /> : <User size={18} />}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-[var(--color-text-primary)]">{u.username}</div>
            {u.full_name && (
              <div className="truncate text-[12px] text-[var(--color-text-muted)]">{u.full_name}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <StatusBadge tone={isAdmin ? 'info' : 'neutral'}>{isAdmin ? 'админ' : 'юзер'}</StatusBadge>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {isAdmin ? 'платформа' : (siteName ?? '⚠ без организации')}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {!u.is_active ? (
          <StatusBadge tone="neutral">неактивен</StatusBadge>
        ) : u.locked ? (
          <StatusBadge tone="warning">заблокирован</StatusBadge>
        ) : (
          <StatusBadge tone="success">активен</StatusBadge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => run(patch.mutateAsync({ id: u.id, patch: { role: isAdmin ? 'user' : 'admin' } }), 'Роль изменена')}
          >
            {isAdmin ? 'снять админа' : 'сделать админом'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => run(patch.mutateAsync({ id: u.id, patch: { is_active: !u.is_active } }), 'Обновлено')}
          >
            {u.is_active ? 'деактивировать' : 'активировать'}
          </Button>
          {u.locked && (
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton aria-label="Снять локаут" disabled={busy} onClick={() => run(action.mutateAsync({ id: u.id, action: 'unlock' }), 'Локаут снят')}>
                  <Lock size={16} />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>Снять локаут</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                aria-label="Сбросить 2FA"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Снять 2FA у «${u.username}»?`))
                    run(action.mutateAsync({ id: u.id, action: '2fa/reset' }), '2FA сброшена')
                }}
              >
                <Shield size={16} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>Сбросить 2FA</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <IconButton
                aria-label="Сбросить пароль"
                disabled={busy}
                onClick={() => {
                  const pw = window.prompt('Новый пароль (минимум 8 символов):')
                  if (!pw) return
                  if (pw.length < 8) return toast.error('Пароль минимум 8 символов')
                  run(action.mutateAsync({ id: u.id, action: 'password', password: pw }), 'Пароль сброшен')
                }}
              >
                <KeyRound size={16} />
              </IconButton>
            </TooltipTrigger>
            <TooltipContent>Сбросить пароль</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  )
}

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateUser()
  const sites = useSites()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('user')
  const [site, setSite] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (role === 'user' && !site) {
      toast.error('Выберите организацию для клиента')
      return
    }
    create
      .mutateAsync({
        username: username.trim(),
        password,
        role,
        full_name: fullName.trim() || null,
        // клиент привязан к своей организации; админ — платформа, без организации
        site_id: role === 'user' ? Number(site) : null,
      })
      .then(() => {
        toast.success('Пользователь создан')
        setUsername('')
        setPassword('')
        setFullName('')
        setRole('user')
        setSite('')
        onOpenChange(false)
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Ошибка создания'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый пользователь</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cu">Логин</Label>
            <Input id="cu" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp">Пароль (8+)</Label>
            <Input id="cp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cf">Имя</Label>
            <Input id="cf" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cr">Роль</Label>
            <select
              id="cr"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
            >
              <option value="user">юзер</option>
              <option value="admin">админ</option>
            </select>
          </div>
          {role === 'user' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs">Организация</Label>
              <select
                id="cs"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 text-sm"
              >
                <option value="">— выберите —</option>
                {(sites.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Клиент увидит только камеры и события этой организации.
              </p>
            </div>
          )}
          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UsersPage() {
  const q = useUsers()
  const sites = useSites()
  const [creating, setCreating] = useState(false)
  const users = q.data ?? []
  const siteName = (id: number | null): string | null =>
    id == null ? null : ((sites.data ?? []).find((s) => s.id === id)?.name ?? `#${id}`)

  return (
    <AppPage
      title="Администраторы"
      description="Пользователи платформы, роли и восстановление входа"
      toolbar={
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> Добавить
        </Button>
      }
    >
      <TableCard>
        {q.isLoading ? (
          <TableSkeleton columns={4} />
        ) : q.isError ? (
          <EmptyState variant="error" title="Не удалось загрузить" action={{ label: 'Повторить', onClick: () => void q.refetch() }} />
        ) : users.length === 0 ? (
          <EmptyState icon={<User size={48} />} title="Пользователей нет" />
        ) : (
          <ResponsiveTable mode="scroll" scrollMinWidth="720px">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ПОЛЬЗОВАТЕЛЬ</TableHead>
                  <TableHead>РОЛЬ</TableHead>
                  <TableHead>СТАТУС</TableHead>
                  <TableHead className="text-right">ДЕЙСТВИЯ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <Row key={u.id} u={u} siteName={siteName(u.site_id)} />
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        )}
      </TableCard>
      <CreateDialog open={creating} onOpenChange={setCreating} />
    </AppPage>
  )
}
