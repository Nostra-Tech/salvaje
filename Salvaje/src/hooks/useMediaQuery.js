import { useEffect, useState } from 'react'

export function useMediaQuery(queryStr) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(queryStr).matches : false
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(queryStr)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mq.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [queryStr])
  return matches
}
