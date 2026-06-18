import { FlaskConical } from 'lucide-react'
import { isLocalMode } from '../services/polla.service'

/**
 * Aviso de modo demo. Aparece cuando la app trabaja contra localStorage porque
 * Firestore no está disponible (reglas sin aplicar / sin permisos / sin red).
 */
export function DemoBanner() {
  if (!isLocalMode()) return null
  return (
    <div className="border-b border-salvaje-gold/30 bg-salvaje-gold/15">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 text-xs text-salvaje-brown">
        <FlaskConical size={15} className="shrink-0 text-salvaje-gold" />
        <span>
          <strong>Modo demo local</strong> — los datos se guardan solo en este navegador (Firestore aún no está
          habilitado). Ideal para probar el flujo completo.
        </span>
      </div>
    </div>
  )
}
