/**
 * Sync helper: when a payment is created with status "pending", emit a notif to all admins.
 * Already integrated via membership.service.createPurchase.
 *
 * Also: helper to notify all admins (broadcast).
 */
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

let cachedAdminUids = null

export async function getAdminUids() {
  if (cachedAdminUids) return cachedAdminUids
  try {
    const snap = await getDocs(collection(db, 'admins'))
    cachedAdminUids = snap.docs.map((d) => d.id)
  } catch (err) {
    console.error('[admin-notifications] could not fetch admin UIDs:', err?.code, err?.message)
    cachedAdminUids = null  // don't cache on error so next call retries
    return []
  }
  return cachedAdminUids
}

/**
 * Send a notification to all active users.
 * Used for broadcast events like a new video upload.
 */
export async function notifyAllUsers({
  type, title, body, relatedId = null, relatedCollection = null,
  senderId = null, senderName = null, senderRole = 'system', senderPhotoURL = null,
  actionType = null, actionUrl = null,
}) {
  const { removeUndefined } = await import('../utils/firestoreHelpers')
  const snap = await getDocs(collection(db, 'users'))
  const userIds = snap.docs.map((d) => d.id)
  await Promise.all(userIds.map((uid) =>
    addDoc(collection(db, 'notifications'), removeUndefined({
      recipientId: uid,
      recipientRole: 'user',
      senderId, senderName, senderRole, senderPhotoURL,
      type, title, body,
      relatedId, relatedCollection,
      actionType, actionUrl,
      isRead: false,
      sentAt: serverTimestamp(),
      readAt: null,
      createdAt: serverTimestamp(),
    }))
  ))
}

/**
 * Send a notification to all admins. Includes sender info if provided.
 */
export async function notifyAllAdmins({
  type, title, body, relatedId = null, relatedCollection = null,
  senderId = null, senderName = null, senderRole = 'system', senderPhotoURL = null,
  actionType = null, actionUrl = null,
}) {
  const { removeUndefined } = await import('../utils/firestoreHelpers')
  const adminUids = await getAdminUids()
  await Promise.all(adminUids.map((uid) =>
    addDoc(collection(db, 'notifications'), removeUndefined({
      recipientId: uid,
      recipientRole: 'admin',
      senderId, senderName, senderRole, senderPhotoURL,
      type, title, body,
      relatedId, relatedCollection,
      actionType, actionUrl,
      isRead: false,
      sentAt: serverTimestamp(),
      readAt: null,
      createdAt: serverTimestamp(),
    }))
  ))
}
