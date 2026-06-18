import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { createNotification } from '../services/notifications.service'
import { safeGet, safeSet } from '../utils/safeStorage'

const ALERT_DAYS = [5, 3, 1]

/**
 * Runs once per login day for users with an active monthly membership.
 * Sends a notification at 5, 3, and 1 day(s) before expiry.
 * Each threshold fires only once — key stored only after success.
 */
export function useMembershipExpiry() {
  const { user, profile } = useAuth()

  useEffect(() => {
    if (!user?.uid || profile?.membershipType !== 'monthly' || !profile?.membershipEndDate) return

    const endDate = profile.membershipEndDate?.toDate
      ? profile.membershipEndDate.toDate()
      : new Date(profile.membershipEndDate)

    const now = new Date()
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))

    if (!ALERT_DAYS.includes(daysLeft)) return

    const key = `membership_expiry_notif_${user.uid}_${daysLeft}d`
    if (safeGet(key)) return

    const messages = {
      5: { title: 'Tu membresía vence en 5 días', body: 'Renueva antes de que expire para no perder tu acceso.' },
      3: { title: 'Tu membresía vence en 3 días ⚠️', body: 'Quedan solo 3 días. Renueva para seguir entrenando sin interrupciones.' },
      1: { title: '¡Tu membresía vence mañana! 🚨', body: 'Último aviso — renueva hoy para no perder el acceso a tus clases.' },
    }

    const { title, body } = messages[daysLeft]

    createNotification({
      recipientId: user.uid,
      recipientRole: 'user',
      type: 'membership_expiring_user',
      title,
      body,
      actionType: 'view',
      actionUrl: '/app/membership',
      senderRole: 'system',
      senderName: 'SALVAJE',
    })
      .then(() => safeSet(key, '1'))
      .catch((e) => console.warn('[useMembershipExpiry] notif failed:', e))
  }, [user?.uid, profile?.membershipEndDate, profile?.membershipType])
}
