/**
 * useFetchData — generic fetch-on-mount hook.
 *
 * Consolidates the repeated pattern across admin list hooks:
 *   const [data, setData] = useState(null)
 *   const [loading, setLoading] = useState(true)
 *   useEffect(() => { fetcher().then(setData).catch(console.error).finally(...) }, deps)
 *
 * Usage:
 *   const { data, loading, error, reload } = useFetchData(
 *     () => adminGetFoo(param),
 *     [param],
 *   )
 *
 * - `reload` is a stable callback that re-triggers the fetch manually.
 * - `error` is surfaced (not swallowed) so callers can display it if needed.
 * - The fetcher reference is always up-to-date via a ref, so callers can
 *   pass an inline arrow function without causing infinite re-fetches.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../utils/errorUtils'

export function useFetchData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep a ref so reload() always calls the latest fetcher closure without
  // being listed in useCallback deps (which would recreate reload every render).
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    fetcherRef.current()
      .then((result) => {
        setData(result)
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load data.'))
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}
