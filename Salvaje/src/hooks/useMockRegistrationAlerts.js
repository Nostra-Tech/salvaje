import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { watchMockRegistrations } from '../services/mockStats'

/**
 * Mientras un admin/superadmin tiene la app abierta, escucha en vivo las nuevas
 * inscripciones a "Salvaje Mock" (landing /mock) y dispara una notificación
 * nativa por cada una. La línea base se fija con las notificaciones ya
 * existentes, así que no llegan avisos repetidos del historial previo.
 */
export function useMockRegistrationAlerts() {
  const { user, role } = useAuth()

  useEffect(() => {
    if (!user?.uid) return
    if (role !== 'admin' && role !== 'superadmin') return
    const unsub = watchMockRegistrations(user.uid, (e) =>
      console.warn('[mock reg alerts] error de suscripción:', e?.code, e?.message),
    )
    return unsub
  }, [user?.uid, role])
}
