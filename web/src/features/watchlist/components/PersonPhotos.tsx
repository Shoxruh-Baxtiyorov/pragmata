import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, Skeleton } from '@/shared/ui'
import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { ApiError } from '@/shared/api/client'
import { ImagePlus, Trash2, X } from '@/shared/ui/icons'
import type { Person } from '@/shared/api/types'
import {
  useAddPersonPhotos,
  useDeletePersonPhoto,
  usePersonPhotos,
  type PersonPhoto,
} from '../api/watchlistApi'

const MAX_FILES = 8

function Thumb({ photo, onDelete, busy }: { photo: PersonPhoto; onDelete: () => void; busy: boolean }) {
  const src = useAuthedMedia(photo.url)
  return (
    <div className="group relative aspect-square overflow-hidden rounded-card border border-border-default bg-bg-secondary">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
      <button
        onClick={onDelete}
        disabled={busy}
        className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-error group-hover:opacity-100 disabled:opacity-40"
        aria-label="delete"
      >
        <Trash2 size={15} />
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
        onError: (e) => setError(e instanceof ApiError ? e.message : t('common.noConnection')),
      },
    )
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Modal onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-h3">{t('watchlist.photos')}</h2>
          <p className="truncate text-body text-text-secondary">{person.name}</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-card p-1.5 text-text-secondary hover:bg-bg-secondary"
        >
          <X size={20} />
        </button>
      </div>

      <p className="mt-3 text-label text-text-secondary">{t('watchlist.photosHint')}</p>

      {photos.isLoading ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
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
        <p className="mt-4 rounded-card border border-dashed border-border-default p-6 text-center text-label text-text-secondary">
          {t('watchlist.noPhotos')}
        </p>
      )}

      {error && <p className="mt-3 text-label text-error">{error}</p>}

      <div className="mt-4 flex items-center gap-3 border-t border-border-default pt-4">
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
        <span className="text-caption text-text-placeholder">
          {t('watchlist.photosCount', { count: photos.data?.length ?? 0 })}
        </span>
      </div>
    </Modal>
  )
}
