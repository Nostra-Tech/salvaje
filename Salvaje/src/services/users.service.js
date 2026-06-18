import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
  orderBy, limit, serverTimestamp, onSnapshot, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { createNotification } from './notifications.service'
import { notifyAllAdmins } from './admin-notifications.service'

export async function getUserById(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function subscribeToUser(uid, callback) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) callback({ id: snap.id, ...snap.data() })
      else callback(null)
    },
    (err) => { console.warn('[users] subscribeToUser error:', err); callback(null) }
  )
}

export async function getAllUsers(options = {}) {
  const snaps = await getDocs(collection(db, 'users'))
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function subscribeToAllUsers(callback) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() })
}

/**
 * Block a user.
 * blockType: 'non_payment' | 'other'
 */
export async function blockUser(uid, reason, blockType = 'other') {
  await updateDoc(doc(db, 'users', uid), {
    isBlocked: true,
    blockReason: reason,
    blockType,
    blockedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function unblockUser(uid) {
  await updateDoc(doc(db, 'users', uid), {
    isBlocked: false,
    blockReason: '',
    blockType: null,
    blockedAt: null,
    unblockRequested: false,
    classAccessRequested: false,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Search a user by phone number (exact match).
 */
export async function searchUserByPhone(phone) {
  const clean = String(phone).trim()
  if (!clean) return null
  const q = query(collection(db, 'users'), where('phone', '==', clean), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

/**
 * Blocked user requests to be unblocked — notifies all admins.
 */
export async function requestUnblock(uid, userName) {
  await updateDoc(doc(db, 'users', uid), {
    unblockRequested: true,
    unblockRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  notifyAllAdmins({
    type: 'unblock_requested',
    title: 'Solicitud de desbloqueo',
    body: `${userName || 'Un usuario'} solicita que se revise el bloqueo de su cuenta.`,
    relatedId: uid,
    relatedCollection: 'users',
    actionType: 'view_user',
    actionUrl: '/admin/users',
    senderRole: 'user',
    senderName: userName || 'Usuario',
  }).catch(() => {})
}

/**
 * User blocked for non-payment requests temporary class access.
 * Notifies all admins and all coaches.
 */
export async function requestClassAccess(uid, userName) {
  await updateDoc(doc(db, 'users', uid), {
    classAccessRequested: true,
    classAccessRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const notifPayload = {
    type: 'class_access_requested',
    title: 'Solicitud de acceso a clase',
    body: `${userName || 'Un usuario'} con pago pendiente solicita acceso temporal a una clase.`,
    relatedId: uid,
    relatedCollection: 'users',
    actionType: 'view_user',
    actionUrl: '/admin/users',
    senderRole: 'user',
    senderName: userName || 'Usuario',
  }

  notifyAllAdmins(notifPayload).catch(() => {})

  // Also notify all coaches — coaches collection, not users
  getDocs(collection(db, 'coaches')).then((coachSnap) =>
    Promise.all(coachSnap.docs.map((d) =>
      createNotification({ ...notifPayload, recipientId: d.id, recipientRole: 'coach' })
    ))
  ).catch(() => {})
}

/**
 * Grant a user temporary "pay later" access.
 * Sends a reminder to both admin and the user that payment is still pending.
 */
export async function grantPendingPaymentAccess(uid, grantedByName = 'Admin') {
  const snap = await getDoc(doc(db, 'users', uid))
  const userName = snap.exists() ? (snap.data().displayName || 'Usuario') : 'Usuario'

  await updateDoc(doc(db, 'users', uid), {
    pendingPaymentAccess: true,
    pendingPaymentGrantedAt: serverTimestamp(),
    classAccessRequested: false,
    updatedAt: serverTimestamp(),
  })

  // Remind the user
  await createNotification({
    recipientId: uid,
    recipientRole: 'user',
    type: 'payment_reminder',
    title: 'Acceso temporal aprobado ⚠️',
    body: `${grantedByName} te dio acceso a una clase. Recuerda que el pago de tu membresía sigue pendiente. ¡Regulariza pronto!`,
    senderRole: 'system',
    senderName: 'SALVAJE',
  })

  // Remind admins that payment is still pending (fire-and-forget)
  notifyAllAdmins({
    type: 'payment_reminder',
    title: 'Recordatorio: pago pendiente',
    body: `Se aprobó acceso temporal a ${userName}. Su pago de membresía aún no ha sido confirmado.`,
    relatedId: uid,
    relatedCollection: 'users',
    actionType: 'view_user',
    actionUrl: '/admin/users',
    senderRole: 'system',
    senderName: 'SALVAJE',
  }).catch((e) => console.warn('[grantAccess] admin notif failed:', e))
}

export async function revokePendingPaymentAccess(uid) {
  await updateDoc(doc(db, 'users', uid), {
    pendingPaymentAccess: false,
    pendingPaymentGrantedAt: null,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Request to freeze a user's membership. Creates a pending freeze request.
 * Admin must approve via approveFreeze().
 */
export async function requestFreeze(uid, reason = '', days = 7) {
  await updateDoc(doc(db, 'users', uid), {
    freezeStatus: 'requested',
    freezeReason: reason,
    freezeDaysRequested: days,
    freezeRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function approveFreeze(uid, adminNote = '') {
  // Read the requested days from the user's doc
  const snap = await getDoc(doc(db, 'users', uid))
  const days = snap.exists() ? (snap.data().freezeDaysRequested || 7) : 7

  // Freeze starts tomorrow — user keeps today as last active day
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const freezeEnd = new Date(tomorrow)
  freezeEnd.setDate(freezeEnd.getDate() + days)

  await updateDoc(doc(db, 'users', uid), {
    isFrozen: true,
    freezeStatus: 'approved',
    frozenAt: serverTimestamp(),
    freezeStartDate: Timestamp.fromDate(tomorrow),
    freezeEndDate: Timestamp.fromDate(freezeEnd),
    freezeDaysApproved: days,
    adminFreezeNote: adminNote,
    updatedAt: serverTimestamp(),
  })

  createNotification({
    recipientId: uid,
    recipientRole: 'user',
    type: 'freeze_approved',
    title: 'Membresía congelada ❄️',
    body: `Tu solicitud de ${days} días fue aprobada. Tu membresía queda congelada a partir de mañana${adminNote ? `. Nota: ${adminNote}` : '.'}`,
    senderRole: 'system',
    senderName: 'SALVAJE',
  }).catch((e) => console.warn('[approveFreeze] notif failed:', e))
}

export async function rejectFreeze(uid) {
  await updateDoc(doc(db, 'users', uid), {
    freezeStatus: 'rejected',
    updatedAt: serverTimestamp(),
  })
  createNotification({
    recipientId: uid,
    recipientRole: 'user',
    type: 'freeze_rejected',
    title: 'Solicitud de congelación rechazada',
    body: 'Tu solicitud para congelar la membresía fue rechazada. Contáctanos si tienes preguntas.',
    senderRole: 'system',
    senderName: 'SALVAJE',
  }).catch((e) => console.warn('[rejectFreeze] notif failed:', e))
}

export async function requestUnfreeze(uid, returnNote = '') {
  await updateDoc(doc(db, 'users', uid), {
    freezeStatus: 'unfreeze_requested',
    unfreezeReturnNote: returnNote,
    unfreezeRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function approveUnfreeze(uid) {
  await updateDoc(doc(db, 'users', uid), {
    isFrozen: false,
    freezeStatus: null,
    frozenAt: null,
    freezeStartDate: null,
    freezeEndDate: null,
    freezeReason: null,
    freezeDaysRequested: null,
    freezeDaysApproved: null,
    updatedAt: serverTimestamp(),
  })
  createNotification({
    recipientId: uid,
    recipientRole: 'user',
    type: 'freeze_lifted',
    title: 'Membresía descongelada ✅',
    body: 'Tu membresía fue descongelada por el administrador. Ya puedes reservar clases.',
    senderRole: 'system',
    senderName: 'SALVAJE',
  }).catch((e) => console.warn('[approveUnfreeze] notif failed:', e))
}

export async function getUserPermanentQR(uid) {
  const q = query(
    collection(db, 'qr_tokens'),
    where('userId', '==', uid),
    where('type', '==', 'permanent'),
    limit(1)
  )
  const snaps = await getDocs(q)
  if (snaps.empty) return null
  return { id: snaps.docs[0].id, ...snaps.docs[0].data() }
}
