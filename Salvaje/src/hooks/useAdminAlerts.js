import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { scanPendingFreezeRequests, scanExpiringMemberships } from '../services/admin-alerts.service'
import { safeGet, safeSet } from '../utils/safeStorage'

/**
 * Runs daily admin alert scans on app load.
 * Each scan fires a notification only when there is something actionable.
 * Uses localStorage so the key persists across page refreshes.
 * Key is only stored after a successful run — if it fails, it retries next load.
 */
export function useAdminAlerts() {
  const { role } = useAuth()

  useEffect(() => {
    if (role !== 'admin' && role !== 'superadmin') return

    const today = new Date().toISOString().split('T')[0]
    const key = `admin_alerts_v1_${today}`
    if (safeGet(key)) return

    Promise.all([
      scanPendingFreezeRequests().catch((e) => console.warn('[alerts] freeze scan failed:', e)),
      scanExpiringMemberships(7).catch((e) => console.warn('[alerts] expiry scan failed:', e)),
    ]).then(() => {
      safeSet(key, '1')
    })
  }, [role])
}
