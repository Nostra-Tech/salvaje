import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { watchPollaRegistrations } from '../services/pollaStats'

/**
 * Mientras un admin/superadmin tiene la app abierta, escucha en vivo los nuevos
 * registros a la Polla Mundialista Salvaje y dispara una notificación nativa por cada uno.
 * Solo registros (no pronósticos). La línea base se fija en la primera carga,
 * así que no llegan avisos del historial previo.
 */
export function usePollaRegistrationAlerts() {
  const { user, role } = useAuth()

  useEffect(() => {
    if (!user?.uid) return
    if (role !== 'admin' && role !== 'superadmin') return
    const unsub = watchPollaRegistrations(user.uid, (e) =>
      console.warn('[polla reg alerts] error de suscripción:', e?.code, e?.message),
    )
    return unsub
  }, [user?.uid, role])
}
