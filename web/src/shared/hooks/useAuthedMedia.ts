import { useEffect, useState } from 'react'
import { fetchAuthedBlob } from '@/shared/api/client'

/** Грузит защищённое Bearer'ом медиа как objectURL. null = ещё грузится/нет. */
export function useAuthedMedia(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let revoked: string | null = null
    let active = true
    fetchAuthedBlob(path)
      .then((objectUrl) => {
        if (active) {
          revoked = objectUrl
          setUrl(objectUrl)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      })
      .catch(() => setUrl(null))
    return () => {
      active = false
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [path])

  return url
}
