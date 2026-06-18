import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { createNotification } from '../services/notifications.service'
import { safeGet, safeSet } from '../utils/safeStorage'

/**
 * Runs once per day when a frozen user opens the app.
 * If their freeze ends tomorrow, sends them a heads-up notification.
 */
export function useFreezeExpiry() {
  const { user, profile } = useAuth()

  useEffect(() => {
    if (!user?.uid || !profile?.isFrozen || !profile?.freezeEndDate) return

    const today = new Date().toISOString().split('T')[0]
    const key = `freeze_expiry_notif_${user.uid}_${today}`
    if (safeGet(key)) return

    const endDate = profile.freezeEndDate?.toDate
      ? profile.freezeEndDate.toDate()
      : new Date(profile.freezeEndDate)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const endDay = new Date(endDate)
    endDay.setHours(0, 0, 0, 0)

    const daysLeft = Math.round((endDay - tomorrow) / (1000 * 60 * 60 * 24))

    if (daysLeft !== 0) return // only fire when end is exactly tomorrow

    createNotification({
      recipientId: user.uid,
      recipientRole: 'user',
      type: 'freeze_ending_soon',
      title: '¡Tu congelación termina mañana! ❄️',
      body: 'A partir de pasado mañana tu membresía vuelve a estar activa y podrás reservar clases.',
      senderRole: 'system',
      senderName: 'SALVAJE',
    })
      .then(() => safeSet(key, '1'))
      .catch((e) => console.warn('[useFreezeExpiry] notif failed:', e))
  }, [user?.uid, profile?.isFrozen, profile?.freezeEndDate])
}
