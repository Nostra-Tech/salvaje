import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { checkAndSendBirthdayGreeting, notifyTomorrowBirthdays } from '../services/birthday.service'
import { updateUser } from '../services/users.service'
import { safeGet, safeSet, safeRemove } from '../utils/safeStorage'

export function useBirthday() {
  const { user, profile, role } = useAuth()
  const [showBirthdayModal, setShowBirthdayModal] = useState(false)

  // User birthday: show modal + send notification once today.
  // localStorage key is set BEFORE the async call (optimistic lock) so re-renders
  // triggered by the Firestore write don't fire a second notification.
  useEffect(() => {
    if (!user?.uid || !profile?.birthDate || role !== 'user') return

    const today = new Date().toISOString().split('T')[0]
    const lsKey = `birthday_greeting_${user.uid}_${today}`

    // Guard 1: localStorage (survives re-renders within the same session)
    if (safeGet(lsKey)) return
    // Guard 2: Firestore field (survives across sessions/devices)
    if (profile.lastBirthdayGreetingSent === today) return

    // Set lock immediately before the async call
    safeSet(lsKey, '1')

    checkAndSendBirthdayGreeting(user.uid, profile).then((isBirthday) => {
      if (isBirthday) {
        setShowBirthdayModal(true)
        updateUser(user.uid, { lastBirthdayGreetingSent: today }).catch(() => {})
      } else {
        // Not birthday — remove lock so it doesn't block future birthdays
        safeRemove(lsKey)
      }
    }).catch(() => {
      safeRemove(lsKey)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profile?.birthDate])

  // Admin/coach: notify about tomorrow's birthdays — once per calendar day.
  // Key is stored in localStorage ONLY after a successful run so a failed attempt
  // (e.g. a prior permission error) will be retried on the next page load.
  useEffect(() => {
    if (!role || (role !== 'admin' && role !== 'superadmin' && role !== 'coach')) return

    const today = new Date().toISOString().split('T')[0]
    const key = `birthday_check_v2_${today}`
    if (safeGet(key)) return

    notifyTomorrowBirthdays(role)
      .then(() => safeSet(key, '1'))
      .catch((e) => console.warn('[birthday] tomorrow check failed, will retry:', e))
  }, [role])

  return { showBirthdayModal, closeBirthdayModal: () => setShowBirthdayModal(false) }
}
