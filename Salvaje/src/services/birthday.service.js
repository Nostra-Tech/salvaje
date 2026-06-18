import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { createNotification } from './notifications.service'
import { notifyAllAdmins } from './admin-notifications.service'

// Normalize birthDate which may be a "YYYY-MM-DD" string or a Firestore Timestamp
function normalizeBirthDate(birthDate) {
  if (!birthDate) return null
  if (typeof birthDate === 'string') return birthDate
  try { return birthDate.toDate().toISOString().slice(0, 10) } catch { return null }
}

/**
 * Checks if a user's birthday is today and sends a greeting notification
 * to the user if they haven't received one today yet.
 */
/**
 * Returns true if today is the user's birthday AND the greeting hasn't been sent yet today.
 * Sends the notification and returns true so the caller can show the birthday modal.
 */
export async function checkAndSendBirthdayGreeting(userId, profile) {
  const bd = normalizeBirthDate(profile?.birthDate)
  if (!bd) return false

  const today = new Date()
  const [, birthMonth, birthDay] = bd.split('-').map(Number)
  const isBirthday = today.getMonth() + 1 === birthMonth && today.getDate() === birthDay

  if (!isBirthday) return false

  // Already sent today
  const lastSent = profile.lastBirthdayGreetingSent
  if (lastSent) {
    const todayStr = today.toISOString().split('T')[0]
    const sentStr = typeof lastSent === 'string' ? lastSent : lastSent?.toDate?.()?.toISOString?.()?.split('T')[0]
    if (sentStr === todayStr) return false
  }

  const firstName = profile.displayName?.split(' ')[0] || 'Salvaje'

  await createNotification({
    recipientId: userId,
    recipientRole: 'user',
    type: 'birthday_greeting',
    title: `¡Feliz Cumpleaños, ${firstName}! 🎉`,
    body: '¡Hoy es tu día! Desde toda la tribu SALVAJE te deseamos un año épico. ¡A celebrar con todo!',
    senderRole: 'system',
    senderName: 'SALVAJE',
  })

  // Detect if the user registered today (new member on their birthday)
  const createdAt = profile.createdAt
  const createdDate = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null
  const isNewMember = createdDate
    ? createdDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]
    : false

  const adminTitle = isNewMember
    ? `🎂 Nuevo miembro con cumpleaños hoy: ${firstName}`
    : `🎂 Cumpleaños hoy: ${firstName}`
  const adminBody = isNewMember
    ? `${profile.displayName || firstName} acaba de unirse a la tribu y ¡hoy es su cumpleaños! Dale la bienvenida.`
    : `¡Hoy es el cumpleaños de ${profile.displayName || firstName}!`

  const adminPayload = {
    type: 'birthday_today',
    title: adminTitle,
    body: adminBody,
    relatedId: userId,
    relatedCollection: 'users',
    actionType: 'view_user',
    actionUrl: '/admin/users',
    senderRole: 'system',
    senderName: 'SALVAJE',
  }

  // Notify admins
  notifyAllAdmins(adminPayload).catch(() => {})

  // Notify all coaches
  getDocs(collection(db, 'coaches')).then((snap) =>
    Promise.all(snap.docs.map((d) =>
      createNotification({ ...adminPayload, recipientId: d.id, recipientRole: 'coach' })
    ))
  ).catch(() => {})

  return true
}

/**
 * Notifies all admins and coaches about users whose birthday is tomorrow.
 * Should be called once per day (e.g., on app load for admin/coach roles).
 */
export async function notifyTomorrowBirthdays(senderRole) {
  if (senderRole !== 'admin' && senderRole !== 'superadmin' && senderRole !== 'coach') return

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowMonth = (tomorrow.getMonth() + 1).toString().padStart(2, '0')
  const tomorrowDay = tomorrow.getDate().toString().padStart(2, '0')

  // Get all users with a birthDate matching tomorrow (month-day)
  const snap = await getDocs(collection(db, 'users'))
  const upcoming = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => {
      const bd = normalizeBirthDate(u.birthDate)
      if (!bd) return false
      const [, m, d] = bd.split('-')
      return m === tomorrowMonth && d === tomorrowDay
    })

  if (upcoming.length === 0) return

  const names = upcoming.map((u) => u.displayName || 'Un salvaje').join(', ')
  const notifPayload = {
    type: 'birthday_tomorrow',
    title: '🎂 Cumpleaños mañana',
    body: `${names} ${upcoming.length === 1 ? 'cumple' : 'cumplen'} años mañana. ¡No lo olvides!`,
    senderRole: 'system',
    senderName: 'SALVAJE',
  }

  // Notify all admins
  await notifyAllAdmins(notifPayload)

  // Notify all coaches — they live in the coaches collection, not users
  const coachSnap = await getDocs(collection(db, 'coaches'))
  await Promise.all(coachSnap.docs.map((d) =>
    createNotification({ ...notifPayload, recipientId: d.id, recipientRole: 'coach' })
  ))
}

/**
 * Get today's birthday users (for displaying birthday banner on load).
 * Used by admin/coach dashboards.
 */
export async function getTodayBirthdays() {
  const today = new Date()
  const todayMonth = (today.getMonth() + 1).toString().padStart(2, '0')
  const todayDay = today.getDate().toString().padStart(2, '0')

  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => {
      const bd = normalizeBirthDate(u.birthDate)
      if (!bd) return false
      const [, m, d] = bd.split('-')
      return m === todayMonth && d === todayDay
    })
}
