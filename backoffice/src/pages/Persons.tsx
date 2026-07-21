import { useState } from 'react'
import { Eye, EyeOff, Images, Trash2, UserRound } from 'lucide-react'
import { api, ApiError, type PersonOut } from '../api'
import { useFetch } from '../hooks'
import { Badge, Button, Card, Select } from '../ui'
import { PageState } from './state'

const CATEGORIES: Record<string, string> = {
  employee: 'сотрудник',
  guest: 'гость',
  watchlist: 'под наблюдением',
  banned: 'запрещён',
}

function Row({ p, reload }: { p: PersonOut; reload: () => void }) {
  const [busy, setBusy] = useState(false)

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

  const toggleWatch = () => run(() => api.patch(`/api/v1/persons/${p.id}`, { watch: !p.watch }))
  const setCategory = (c: string) => run(() => api.patch(`/api/v1/persons/${p.id}`, { category: c }))
  const remove = () => {
    if (window.confirm(`Удалить «${p.name}» из реестра?`))
      run(() => api.del(`/api/v1/persons/${p.id}`))
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border-default py-3 last:border-0">
      <span className={p.watch ? 'text-error' : 'text-text-secondary'}>
        <UserRound size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold" title={p.name}>
          {p.name}
        </p>
        {p.position && <p className="truncate text-caption text-text-placeholder">{p.position}</p>}
      </div>

      <span className="flex items-center gap-1 text-caption text-text-placeholder">
        <Images size={14} /> {p.photo_count}
      </span>
      {p.watch && <Badge tone="error">наблюдение</Badge>}

      <Select
        value={p.category}
        onChange={setCategory}
        className="w-44 text-label"
      >
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </Select>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleWatch}
          disabled={busy}
          title={p.watch ? 'Снять наблюдение' : 'Взять под наблюдение'}
        >
          {p.watch ? <EyeOff size={17} /> : <Eye size={17} />}
        </Button>
        <Button variant="ghost" size="icon" onClick={remove} disabled={busy} title="Удалить">
          <Trash2 size={17} />
        </Button>
      </div>
    </div>
  )
}

export function Persons() {
  const q = useFetch<PersonOut[]>(() => api.get('/api/v1/persons'))

  return (
    <PageState loading={q.loading} error={q.error} reload={q.reload}>
      <div className="flex flex-col gap-4">
        <p className="text-label text-text-secondary">
          Эталон лица берётся из фото при регистрации. Регистрация с фото — в операторском
          интерфейсе; здесь категории, наблюдение и удаление.
        </p>
        {q.data && q.data.length === 0 ? (
          <Card className="p-8 text-center text-label text-text-secondary">Реестр пуст</Card>
        ) : (
          <Card className="p-4">
            {q.data?.map((p) => (
              <Row key={p.id} p={p} reload={q.reload} />
            ))}
          </Card>
        )}
      </div>
    </PageState>
  )
}
