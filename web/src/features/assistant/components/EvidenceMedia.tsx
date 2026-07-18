import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import type { MediaEvidence } from '@/shared/api/types'

export function EvidenceMedia({ item }: { item: MediaEvidence }) {
  const photo = useAuthedMedia(item.photo_url)
  const clip = useAuthedMedia(item.clip_url)
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-white">
      <div className="aspect-video bg-black">
        {clip ? (
          <video src={clip} controls className="h-full w-full" />
        ) : photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full animate-pulse bg-[var(--color-bg-muted)]" />
        )}
      </div>
      {item.caption && <p className="truncate px-2 py-1 text-xs text-[var(--color-text-muted)]">{item.caption}</p>}
    </div>
  )
}
