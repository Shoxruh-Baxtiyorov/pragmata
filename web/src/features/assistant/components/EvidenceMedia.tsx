import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import { Skeleton } from '@/shared/ui'
import type { MediaEvidence } from '@/shared/api/types'

export function EvidenceMedia({ item }: { item: MediaEvidence }) {
  const photo = useAuthedMedia(item.photo_url)
  const clip = useAuthedMedia(item.clip_url)
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-xs)] transition hover:border-[var(--color-border-strong)]">
      <div className="aspect-video bg-black">
        {clip ? (
          <video src={clip} controls className="h-full w-full" />
        ) : photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>
      {item.caption && (
        <p className="truncate px-3 py-2 text-caption text-[var(--color-text-secondary)]">
          {item.caption}
        </p>
      )}
    </div>
  )
}
