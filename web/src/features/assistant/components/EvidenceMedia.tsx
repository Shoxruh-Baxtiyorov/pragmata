import { useAuthedMedia } from '@/shared/hooks/useAuthedMedia'
import type { MediaEvidence } from '@/shared/api/types'

export function EvidenceMedia({ item }: { item: MediaEvidence }) {
  const photo = useAuthedMedia(item.photo_url)
  const clip = useAuthedMedia(item.clip_url)
  return (
    <div className="overflow-hidden rounded-card border border-border-default bg-surface">
      <div className="aspect-video bg-black">
        {clip ? (
          <video src={clip} controls className="h-full w-full" />
        ) : photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full animate-pulse bg-bg-secondary" />
        )}
      </div>
      {item.caption && (
        <p className="truncate px-2 py-1 text-caption text-text-secondary">{item.caption}</p>
      )}
    </div>
  )
}
