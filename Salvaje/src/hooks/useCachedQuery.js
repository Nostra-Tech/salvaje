import { useEffect, useState, useRef } from 'react'

/**
 * Cache-first query hook with stale-while-revalidate.
 * Returns cached data immediately if fresh enough, then refetches in background.
 */
export function useCachedQuery(cacheKey, fetcher, { ttlMs = 2 * 60 * 1000 } = {}) {
  const [data, setData] = useState(() => {
    try {
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const { ts, value } = JSON.parse(raw)
        if (Date.now() - ts < ttlMs) return value
      }
    } catch {}
    return null
  })
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    const cachedRaw = (() => { try { return sessionStorage.getItem(cacheKey) } catch { return null } })()
    let isFresh = false
    if (cachedRaw) {
      try {
        const { ts } = JSON.parse(cachedRaw)
        isFresh = (Date.now() - ts < ttlMs)
      } catch {}
    }
    // Always refetch in background, but only show loading if no cache
    if (!isFresh && !data) setLoading(true)
    fetcher()
      .then((value) => {
        if (cancelled || !mounted.current) return
        setData(value)
        setError(null)
        // Defer heavy serialization off the render cycle and skip if >300 KB
        // to avoid freezing the main thread with large Firestore datasets.
        setTimeout(() => {
          try {
            const serialized = JSON.stringify({ ts: Date.now(), value })
            if (serialized.length < 300_000) sessionStorage.setItem(cacheKey, serialized)
          } catch {}
        }, 0)
      })
      .catch((e) => {
        if (cancelled || !mounted.current) return
        setError(e)
      })
      .finally(() => {
        if (cancelled || !mounted.current) return
        setLoading(false)
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return { data, loading, error }
}
