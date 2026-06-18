/**
 * Admin alert scans — run once per day when admin loads the app.
 * Each function queries Firestore and fires a summary notification
 * to all admins for pending items that need attention.
 */
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import { notifyAllAdmins } from './admin-notifications.service'

/**
 * Find users with a pending freeze request and notify all admins.
 * Safe to call multiple times — only notifies when there are actually pending requests.
 */
export async function scanPendingFreezeRequests() {
  const snap = await getDocs(
    query(collection(db, 'users'), where('freezeStatus', '==', 'requested'))
  )
  if (snap.empty) return

  const users = snap.docs.map((d) => d.data())
  const names = users.map((u) => u.displayName || 'Un usuario').join(', ')
  const count = users.length

  await notifyAllAdmins({
    type: 'freeze_requested_summary',
    title: count === 1
      ? `${users[0].displayName || 'Un usuario'} solicita congelar su membresía`
      : `${count} usuarios solicitan congelar su membresía`,
    body: count === 1
      ? 'Revisa y aprueba o rechaza en la sección de Usuarios.'
      : `${names}. Revisa en la sección de Usuarios.`,
    actionType: 'view_user',
    actionUrl: '/admin/users',
    senderRole: 'system',
    senderName: 'SALVAJE',
  })
}

/**
 * Find users whose monthly membership expires within `daysAhead` days
 * and notify all admins with a summary.
 */
export async function scanExpiringMemberships(daysAhead = 7) {
  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  // Query all active members (client-side filter keeps it index-free)
  const snap = await getDocs(
    query(collection(db, 'users'), where('membershipIsActive', '==', true))
  )

  const expiring = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => {
      const end = u.membershipEndDate?.toDate?.()
        || (u.membershipEndDate ? new Date(u.membershipEndDate) : null)
      if (!end) return false
      return end > now && end <= cutoff
    })
    .sort((a, b) => {
      const ta = a.membershipEndDate?.toDate?.() || new Date(a.membershipEndDate)
      const tb = b.membershipEndDate?.toDate?.() || new Date(b.membershipEndDate)
      return ta - tb
    })

  if (expiring.length === 0) return

  const lines = expiring.map((u) => {
    const end = u.membershipEndDate?.toDate?.() || new Date(u.membershipEndDate)
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    return `${u.displayName || 'Usuario'} (${daysLeft === 1 ? 'vence mañana' : `vence en ${daysLeft} días`})`
  }).join(' · ')

  const urgentCount = expiring.filter((u) => {
    const end = u.membershipEndDate?.toDate?.() || new Date(u.membershipEndDate)
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24)) <= 2
  }).length

  await notifyAllAdmins({
    type: 'membership_expiring_soon',
    title: expiring.length === 1
      ? `Membresía próxima a vencer`
      : `${expiring.length} membresías próximas a vencer${urgentCount > 0 ? ` (${urgentCount} urgente${urgentCount > 1 ? 's' : ''})` : ''}`,
    body: lines,
    actionType: 'view',
    actionUrl: '/admin/users',
    senderRole: 'system',
    senderName: 'SALVAJE',
  })
}
