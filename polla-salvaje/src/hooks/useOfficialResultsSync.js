import { useEffect } from 'react'
import { syncOfficialResults } from '../services/resultsProvider'

/**
 * Mantiene los resultados oficiales al día: sincroniza al cargar, cada 10 min
 * y al volver a la pestaña. Los partidos sin marcador quedan "esperando" y
 * empiezan a puntuar solos cuando aparece el resultado.
 */
export function useOfficialResultsSync() {
  useEffect(() => {
    let alive = true
    const run = () => { if (alive) syncOfficialResults() }
    run()
    const iv = setInterval(run, 10 * 60 * 1000)
    const onVis = () => { if (!document.hidden) run() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      alive = false
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
}
