import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Input,
  Modal,
  PageHeader,
  Select,
  SkeletonGrid,
} from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { cn } from '@/shared/lib/utils'
import {
  Bell,
  BellOff,
  Check,
  ChevronRight,
  Folder,
  FolderPlus,
  ImagePlus,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from '@/shared/ui/icons'
import { PersonPhotos } from '../components/PersonPhotos'
import { PERSON_CATEGORIES, type Person, type PersonCategoryRow, type PersonFolder } from '@/shared/api/types'
import { useEntitlements } from '@/features/auth'
import {
  useCreateCategory,
  useCreateFolder,
  useDeleteCategory,
  useDeleteFolder,
  useDeletePerson,
  useEnrollPerson,
  usePatchFolder,
  usePatchPerson,
  usePersonCategories,
  usePersonFolders,
  usePersons,
} from '../api/watchlistApi'

// Цвет = смысл: тревожные категории видны, обычные остаются нейтральными
const CAT_TONE: Record<string, 'warning' | 'error'> = {
  watchlist: 'warning',
  banned: 'error',
}

type CatLabel = (key: string) => string

// системные категории имеют перевод в i18n (локализуем под язык интерфейса);
// пользовательские показываем под их сохранённым именем
const SYSTEM_CAT_KEYS = new Set<string>(PERSON_CATEGORIES)

// категории, открытые тарифом: кастомные видны всегда, системные — по entitlement
function useVisibleCategories(): PersonCategoryRow[] {
  const { data } = usePersonCategories()
  const ent = useEntitlements()
  return useMemo(
    () =>
      (data ?? []).filter(
        (c) => ent.all || !c.is_system || ent.person_categories.includes(c.key),
      ),
    [data, ent],
  )
}

// плоский список папок с отступом по глубине — для выпадающих списков
function flattenFolders(folders: PersonFolder[]): { id: string; label: string }[] {
  const byParent = new Map<string | null, PersonFolder[]>()
  for (const f of folders) {
    const arr = byParent.get(f.parent_id) ?? []
    arr.push(f)
    byParent.set(f.parent_id, arr)
  }
  const out: { id: string; label: string }[] = []
  const walk = (parentId: string | null, depth: number) => {
    const kids = (byParent.get(parentId) ?? []).sort((a, b) => a.name.localeCompare(b.name))
    for (const f of kids) {
      out.push({ id: f.id, label: `${' '.repeat(depth)}${f.name}` })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

// ── дерево папок ──────────────────────────────────────────────────────────────

type EditState = { parentId: string | null; id: string | null } | null

function FolderTree({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const { t } = useTranslation()
  const { data: folders = [] } = usePersonFolders()
  const create = useCreateFolder()
  const patch = usePatchFolder()
  const del = useDeleteFolder()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<EditState>(null)
  const [draft, setDraft] = useState('')
  const [confirmDel, setConfirmDel] = useState<PersonFolder | null>(null)

  const byParent = useMemo(() => {
    const m = new Map<string | null, PersonFolder[]>()
    for (const f of folders) {
      const arr = m.get(f.parent_id) ?? []
      arr.push(f)
      m.set(f.parent_id, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => a.name.localeCompare(b.name))
    return m
  }, [folders])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const startAdd = (parentId: string | null) => {
    if (parentId) setExpanded((prev) => new Set(prev).add(parentId))
    setEdit({ parentId, id: null })
    setDraft('')
  }
  const startRename = (f: PersonFolder) => {
    setEdit({ parentId: f.parent_id, id: f.id })
    setDraft(f.name)
  }
  const commit = () => {
    const name = draft.trim()
    if (!name || !edit) return setEdit(null)
    if (edit.id) patch.mutate({ id: edit.id, patch: { name } })
    else create.mutate({ name, parent_id: edit.parentId })
    setEdit(null)
    setDraft('')
  }

  const draftInput = (
    <div className="flex items-center gap-1 py-0.5">
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEdit(null)
        }}
        placeholder={t('people.folderName')}
        className="h-8 flex-1 text-caption"
      />
      <button
        type="button"
        onClick={commit}
        className="rounded-[var(--radius-sm)] p-1 text-[var(--color-brand-text)] hover:bg-[var(--color-bg-muted)]"
        title={t('people.save')}
      >
        <Check size={16} />
      </button>
      <button
        type="button"
        onClick={() => setEdit(null)}
        className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-bg-muted)]"
        title={t('people.cancel')}
      >
        <X size={16} />
      </button>
    </div>
  )

  const renderNode = (node: PersonFolder, depth: number) => {
    const kids = byParent.get(node.id) ?? []
    const isOpen = expanded.has(node.id)
    const isSel = selected === node.id
    const renaming = edit?.id === node.id
    return (
      <li key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded-[var(--radius-md)] pr-1 transition',
            isSel ? 'bg-[var(--color-brand-500)]/12' : 'hover:bg-[var(--color-bg-muted)]',
          )}
          style={{ paddingLeft: depth * 14 }}
        >
          <button
            type="button"
            onClick={() => kids.length && toggle(node.id)}
            className={cn(
              'shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-subtle)]',
              !kids.length && 'invisible',
            )}
            title={isOpen ? '−' : '+'}
          >
            <ChevronRight
              size={16}
              className={cn('transition-transform', isOpen && 'rotate-90')}
            />
          </button>

          {renaming ? (
            <div className="flex-1">{draftInput}</div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelect(node.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-caption outline-none',
                  isSel
                    ? 'font-medium text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)]',
                )}
              >
                <Folder size={16} className="shrink-0 text-[var(--color-brand-text)]" />
                <span className="truncate" title={node.name}>
                  {node.name}
                </span>
                {node.count > 0 && (
                  <span className="ml-auto shrink-0 rounded-pill bg-[var(--color-bg-muted)] px-1.5 text-[11px] text-[var(--color-text-subtle)]">
                    {node.count}
                  </span>
                )}
              </button>
              <div
                className={cn(
                  'flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100',
                  isSel && 'opacity-100',
                )}
              >
                <button
                  type="button"
                  onClick={() => startAdd(node.id)}
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text-primary)]"
                  title={t('people.subfolder')}
                >
                  <FolderPlus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => startRename(node)}
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text-primary)]"
                  title={t('people.renameFolder')}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDel(node)}
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-subtle)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-error-500)]"
                  title={t('people.deleteFolder')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {edit?.id === null && edit.parentId === node.id && (
          <div style={{ paddingLeft: (depth + 1) * 14 + 4 }}>{draftInput}</div>
        )}

        {isOpen && kids.length > 0 && (
          <ul>{kids.map((k) => renderNode(k, depth + 1))}</ul>
        )}
      </li>
    )
  }

  const roots = byParent.get(null) ?? []

  return (
    <Card className="p-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'mb-1 flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left text-caption font-medium outline-none transition',
          selected === null
            ? 'bg-[var(--color-brand-500)]/12 text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]',
        )}
      >
        <Users size={16} className="text-[var(--color-brand-text)]" />
        {t('people.allPeople')}
      </button>

      <ul className="text-caption">{roots.map((r) => renderNode(r, 0))}</ul>

      {edit?.id === null && edit.parentId === null && (
        <div className="px-1">{draftInput}</div>
      )}

      {roots.length === 0 && !edit && (
        <p className="px-2 py-2 text-caption text-[var(--color-text-subtle)]">
          {t('people.foldersHint')}
        </p>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start text-[var(--color-text-secondary)]"
        onClick={() => startAdd(null)}
      >
        <FolderPlus size={16} /> {t('people.newFolder')}
      </Button>

      <ConfirmDialog
        open={confirmDel !== null}
        title={t('people.deleteFolder')}
        description={t('people.confirmDeleteFolder', { name: confirmDel?.name ?? '' })}
        confirmLabel={t('manage.delete')}
        busy={del.isPending}
        onConfirm={() => {
          if (confirmDel) {
            if (selected === confirmDel.id) onSelect(confirmDel.parent_id)
            del.mutate(confirmDel.id)
          }
          setConfirmDel(null)
        }}
        onCancel={() => setConfirmDel(null)}
      />
    </Card>
  )
}

// ── управление категориями ────────────────────────────────────────────────────

function CategoryManager({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const cats = useVisibleCategories()
  const create = useCreateCategory()
  const del = useDeleteCategory()
  const [name, setName] = useState('')
  const [confirmDel, setConfirmDel] = useState<PersonCategoryRow | null>(null)

  const add = () => {
    const n = name.trim()
    if (!n) return
    create.mutate(n, { onSuccess: () => setName('') })
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-1 pr-8 text-h2 font-semibold text-[var(--color-text-primary)]">
        {t('people.categories')}
      </h2>
      <p className="mb-4 text-caption text-[var(--color-text-secondary)]">
        {t('people.categoriesHint')}
      </p>

      {cats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cats.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-pill border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] py-1.5 pl-3 pr-2 text-caption text-[var(--color-text-secondary)]"
            >
              {c.is_system ? t(`people.cat.${c.key}`) : c.name}
              <button
                type="button"
                onClick={() => setConfirmDel(c)}
                className="rounded-full p-0.5 text-[var(--color-text-subtle)] transition hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-error-500)]"
                title={t('manage.delete')}
              >
                <X size={16} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder={t('people.categoryName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          autoFocus
        />
        <Button onClick={add} loading={create.isPending} disabled={!name.trim()}>
          <FolderPlus size={16} /> {t('people.add')}
        </Button>
      </div>
      {create.isError && (
        <ErrorNote className="mt-2">{apiErrorMessage(create.error, t)}</ErrorNote>
      )}
      {del.isError && <ErrorNote className="mt-2">{apiErrorMessage(del.error, t)}</ErrorNote>}

      <ConfirmDialog
        open={confirmDel !== null}
        title={t('manage.delete')}
        description={t('people.confirmDeleteCategory', { name: confirmDel?.name ?? '' })}
        confirmLabel={t('manage.delete')}
        busy={del.isPending}
        onConfirm={() => {
          if (confirmDel) del.mutate(confirmDel.id)
          setConfirmDel(null)
        }}
        onCancel={() => setConfirmDel(null)}
      />
    </Modal>
  )
}

// ── карточка человека ─────────────────────────────────────────────────────────

function PersonCard({ p, catLabel }: { p: Person; catLabel: CatLabel }) {
  const { t } = useTranslation()
  const photo = useAuthedMedia(p.photo_url)
  const patch = usePatchPerson()
  const del = useDeletePerson()
  const [photosOpen, setPhotosOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Card className="flex flex-col gap-0 overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)]">
      <div className="relative h-60 shrink-0 bg-black">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[var(--color-bg-muted)] text-[var(--color-text-subtle)]">
            <UserPlus size={32} />
          </div>
        )}
        {/* под наблюдением — единственное состояние, о котором оператор должен узнать с карточки */}
        {p.watch && (
          <Badge tone="warning" className="absolute left-2 top-2">
            <Bell size={16} /> {t('watchlist.watched')}
          </Badge>
        )}
      </div>
      <div className="flex-1 space-y-1.5 px-3 py-3">
        <p className="truncate text-body font-medium text-[var(--color-text-primary)]" title={p.name}>
          {p.name}
        </p>
        {p.category && (
          <Badge tone={CAT_TONE[p.category] ?? 'neutral'}>{catLabel(p.category)}</Badge>
        )}
        {p.position && (
          <p className="truncate text-caption text-[var(--color-text-secondary)]" title={p.position}>
            {p.position}
          </p>
        )}
        <p className="text-caption text-[var(--color-text-secondary)]">
          {t('watchlist.seen')}: {p.seen_count} · {t('people.photoCount', { count: p.photo_count })}
        </p>
      </div>
      <div className="flex gap-1 px-2 pb-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          loading={patch.isPending}
          onClick={() => patch.mutate({ id: p.id, patch: { watch: !p.watch } })}
        >
          {p.watch ? <BellOff size={16} /> : <Bell size={16} />}
          {p.watch ? t('watchlist.unwatch') : t('watchlist.watch')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPhotosOpen(true)}
          title={t('watchlist.photos')}
        >
          <ImagePlus size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={del.isPending}
          title={t('manage.delete')}
          onClick={() => setConfirmDel(true)}
        >
          <Trash2 size={16} />
        </Button>
      </div>

      {/* Человек удалялся с одного клика, без вопроса — вместе с ним пропадают
          все его фото и эталон лица. Спрашиваем, как и при удалении камеры. */}
      <ConfirmDialog
        open={confirmDel}
        title={t('manage.delete')}
        description={t('watchlist.confirmDelete', { name: p.name })}
        confirmLabel={t('manage.delete')}
        busy={del.isPending}
        onConfirm={() => {
          del.mutate(p.id)
          setConfirmDel(false)
        }}
        onCancel={() => setConfirmDel(false)}
      />

      {photosOpen && <PersonPhotos person={p} onClose={() => setPhotosOpen(false)} />}
    </Card>
  )
}

// ── форма регистрации ─────────────────────────────────────────────────────────

function RegisterForm({
  onClose,
  defaultFolderId,
}: {
  onClose: () => void
  defaultFolderId: string | null
}) {
  const { t } = useTranslation()
  const enroll = useEnrollPerson()
  const cats = useVisibleCategories()
  const { data: folders = [] } = usePersonFolders()
  const folderOptions = useMemo(() => flattenFolders(folders), [folders])

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [folderId, setFolderId] = useState<string>(defaultFolderId ?? '')
  const [position, setPosition] = useState('')
  const [note, setNote] = useState('')
  const [watch, setWatch] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  // категория необязательна: по умолчанию «без категории» ('')
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || files.length === 0) return
    enroll.mutate(
      {
        name: name.trim(),
        category,
        position: position.trim(),
        note: note.trim(),
        watch,
        folderId: folderId || null,
        files,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal onClose={onClose} className="max-w-xl">
      <h2 className="mb-4 pr-8 text-h2 font-semibold text-[var(--color-text-primary)]">
        {t('people.register')}
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          placeholder={t('people.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={category} onChange={setCategory}>
            <option value="">{t('people.noCategory')}</option>
            {cats.map((c) => (
              <option key={c.key} value={c.key}>
                {c.is_system ? t(`people.cat.${c.key}`) : c.name}
              </option>
            ))}
          </Select>
          <Select value={folderId} onChange={setFolderId}>
            <option value="">{t('people.noFolder')}</option>
            {folderOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder={t('people.position')}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
          <Input
            placeholder={t('people.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-body text-[var(--color-text-secondary)]">
          <input type="checkbox" checked={watch} onChange={(e) => setWatch(e.target.checked)} />
          {t('people.alertOnSeen')}
        </label>

        <div>
          <label className="mb-1 block text-label text-[var(--color-text-secondary)]">
            {t('people.photos')} — {t('people.photosHint')}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              setFiles((prev) => {
                const merged = [...prev]
                for (const f of picked) {
                  if (!merged.some((g) => g.name === f.name && g.size === f.size)) merged.push(f)
                }
                return merged.slice(0, 8)
              })
              e.target.value = '' // сбрасываем, чтобы можно было доложить ещё фото (в т.ч. те же)
            }}
            className="text-body text-[var(--color-text-secondary)] file:mr-3 file:rounded-[var(--radius-md)] file:border-0 file:bg-[var(--color-brand-500)]/10 file:px-3 file:py-1.5 file:text-[var(--color-brand-text)]"
          />
          <p className="mt-1 text-caption text-[var(--color-text-secondary)]">
            {t('people.photosMulti')}
          </p>
          {previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="size-16 rounded-[var(--radius-md)] border border-[var(--color-border-soft)] object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--color-error-500)] p-1 text-white shadow-[var(--shadow-sm)] outline-none transition hover:bg-[var(--color-danger-600)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]"
                    onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {enroll.isError && <ErrorNote>{apiErrorMessage(enroll.error, t)}</ErrorNote>}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('people.cancel')}
          </Button>
          <Button type="submit" loading={enroll.isPending} disabled={!name.trim() || !files.length}>
            {t('people.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── страница ──────────────────────────────────────────────────────────────────

export function WatchlistPage() {
  const { t } = useTranslation()
  const [catFilter, setCatFilter] = useState<string>('all')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [managingCats, setManagingCats] = useState(false)

  const cats = useVisibleCategories()
  const { data: folders = [] } = usePersonFolders()
  const catMap = useMemo(() => new Map(cats.map((c) => [c.key, c.name])), [cats])
  const catLabel: CatLabel = (key) =>
    SYSTEM_CAT_KEYS.has(key) ? t(`people.cat.${key}`) : (catMap.get(key) ?? key)

  const { data, isLoading, isError, refetch } = usePersons(
    catFilter === 'all' ? undefined : catFilter,
    folderId ?? undefined,
  )

  const chips = ['all', ...cats.map((c) => c.key)]
  const currentTitle = folderId
    ? (folders.find((f) => f.id === folderId)?.name ?? t('people.folder'))
    : t('people.allPeople')

  return (
    <>
      <PageHeader
        title={t('watchlist.title')}
        subtitle={t('watchlist.subtitle')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setManagingCats((v) => !v)}
              title={t('people.manageCategories')}
            >
              <Pencil size={16} /> {t('people.categories')}
            </Button>
            <Button onClick={() => setRegistering((v) => !v)}>
              <UserPlus size={16} /> {t('people.register')}
            </Button>
          </div>
        }
      />

      {managingCats && <CategoryManager onClose={() => setManagingCats(false)} />}
      {registering && (
        <RegisterForm onClose={() => setRegistering(false)} defaultFolderId={folderId} />
      )}

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <aside>
          <FolderTree selected={folderId} onSelect={setFolderId} />
        </aside>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-h2 font-semibold text-[var(--color-text-primary)]">
              {currentTitle}
            </h2>
            {!isLoading && data && (
              <span className="rounded-pill bg-[var(--color-bg-muted)] px-2 py-0.5 text-caption font-medium text-[var(--color-text-subtle)]">
                {data.length}
              </span>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={cn(
                  'rounded-pill px-3 py-1.5 text-caption font-medium outline-none transition focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]',
                  catFilter === c
                    ? 'bg-[var(--color-brand-500)] text-[var(--color-text-on-brand)]'
                    : 'bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {c === 'all' ? t('people.filterAll') : catLabel(c)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <SkeletonGrid />
          ) : isError ? (
            <EmptyState text={t('common.noConnection')} onRetry={refetch} />
          ) : !data || data.length === 0 ? (
            <EmptyState text={`${t('watchlist.empty')} — ${t('watchlist.emptyHint')}`} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {data.map((p) => (
                <PersonCard key={p.id} p={p} catLabel={catLabel} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
