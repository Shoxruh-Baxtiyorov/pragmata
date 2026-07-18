import { useEffect, useState } from 'react'
import { fetchAuthedBlob } from '@/shared/api/client'

// objectURL с корректным жизненным циклом (revoke на cleanup, StrictMode-safe)
export function useAuthedMedia(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!path) return
    let active = true
    let objectUrl: string | null = null
    fetchAuthedBlob(path)
      .then((u) => {
        objectUrl = u
        if (active) setUrl(u)
        else URL.revokeObjectURL(u)
      })
      .catch(() => {
        if (active) setUrl(null)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])
  return url
}
