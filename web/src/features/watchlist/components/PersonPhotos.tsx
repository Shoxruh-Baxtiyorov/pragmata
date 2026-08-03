import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, ErrorNote, Modal, Skeleton, SkeletonGrid } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { ImagePlus, Trash2 } from '@/shared/ui/icons'
import type { Person } from '@/shared/api/types'
import {
  useAddPersonPhotos,
  useDeletePersonPhoto,
  usePersonPhotos,
  type PersonPhoto,
} from '../api/watchlistApi'

const MAX_FILES = 8

function Thumb({ photo, onDelete, busy }: { photo: PersonPhoto; onDelete: () => void; busy: boolean }) {
  const { t } = useTranslation()
  const src = useAuthedMedia(photo.url)
  return (
    <div className="group relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] transition hover:border-[var(--color-border-strong)]">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
      {/* кнопка появляется по наведению, но остаётся достижимой с клавиатуры */}
      <button
        onClick={onDelete}
        disabled={busy}
        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 outline-none transition hover:bg-[var(--color-error-500)] focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)] group-hover:opacity-100 disabled:opacity-40"
        aria-label={t('manage.delete')}
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

/**
 * Раньше фото можно было приложить только при регистрации: посмотреть, добавить
 * или удалить снимки потом было негде. А эталон лица — среднее по всем фото,
 * поэтому это напрямую про точность узнавания.
 */
export function PersonPhotos({ person, onClose }: { person: Person; onClose: () => void }) {
  const { t } = useTranslation()
  const photos = usePersonPhotos(person.id)
  const add = useAddPersonPhotos()
  const del = useDeletePersonPhoto()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const pick = (files: FileList | null) => {
    if (!files?.length) return
    setError('')
    add.mutate(
      { id: person.id, files: Array.from(files).slice(0, MAX_FILES) },
      {
        onError: (e) => setError(apiErrorMessage(e, t)),
      },
    )
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Modal onClose={onClose} className="max-w-2xl">
      <div className="pr-8">
        <h2 className="truncate text-h3">{t('watchlist.photos')}</h2>
        <p className="truncate text-body text-[var(--color-text-secondary)]">{person.name}</p>
      </div>

      <p className="mt-3 text-label text-[var(--color-text-secondary)]">{t('watchlist.photosHint')}</p>

      {photos.isLoading ? (
        <SkeletonGrid count={4} item="aspect-square" cols="mt-4 grid-cols-3 gap-3 sm:grid-cols-4" />
      ) : photos.data && photos.data.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.data.map((p) => (
            <Thumb
              key={p.id}
              photo={p}
              busy={del.isPending}
              onDelete={() => del.mutate({ photoId: p.id, personId: person.id })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ImagePlus size={24} />}
          text={t('watchlist.noPhotos')}
          className="mt-4 p-6"
        />
      )}

      {error && <ErrorNote className="mt-3">{error}</ErrorNote>}

      <div className="mt-4 flex items-center gap-3 border-t border-[var(--color-border-soft)] pt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => pick(e.target.files)}
        />
        <Button onClick={() => fileRef.current?.click()} loading={add.isPending}>
          <ImagePlus size={16} /> {t('watchlist.addPhotos')}
        </Button>
        <span className="text-caption text-[var(--color-text-subtle)]">
          {t('watchlist.photosCount', { count: photos.data?.length ?? 0 })}
        </span>
      </div>
    </Modal>
  )
}
