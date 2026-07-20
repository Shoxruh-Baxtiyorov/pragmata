import { useCallback, useEffect, useState } from 'react'
import { ApiError } from './api'

export type Async<T> = {
  data: T | null
  loading: boolean
  error: ApiError | null
  reload: () => void
}

// Простая загрузка GET-данных с перезагрузкой (react-query не тянем — 4 экрана).
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [tick, setTick] = useState(0)

  // fn меняется каждый рендер — фиксируем зависимость по явным deps вызывающего
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    run()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e : new ApiError(0, String(e))))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [run, tick])

  return { data, loading, error, reload: () => setTick((n) => n + 1) }
}
