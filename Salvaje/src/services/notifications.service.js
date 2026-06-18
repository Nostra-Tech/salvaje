import {
  collection, query, where, orderBy, getDocs, updateDoc, getDoc,
  doc, addDoc, deleteDoc, serverTimestamp, onSnapshot, limit, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

export function subscribeToNotifications(userId, callback, onError) {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(80)
  )
  return onSnapshot(
    q,
    (snap) => {
      const notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(notifs)
    },
    (err) => {
      console.error('[notifications] subscription error:', err?.code, err?.message)
      onError?.(err)
      callback([])
    }
  )
}

export async function markAsRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), {
    isRead: true,
    readAt: serverTimestamp(),
  })
}

export async function markAllAsRead(userId) {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isRead', '==', false)
  )
  const snaps = await getDocs(q)
  const updates = snaps.docs.map((d) => updateDoc(d.ref, { isRead: true, readAt: serverTimestamp() }))
  await Promise.all(updates)
}

/** Elimina una notificación (su propietario o un admin). */
export async function deleteNotification(notifId) {
  await deleteDoc(doc(db, 'notifications', notifId))
}

/** Elimina TODAS las notificaciones de un usuario. */
export async function deleteAllNotifications(userId) {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId))
  const snaps = await getDocs(q)
  await Promise.all(snaps.docs.map((d) => deleteDoc(d.ref)))
}

export async function createNotification({
  recipientId, recipientRole, type, title, body,
  relatedId = null, relatedCollection = null,
  senderId = null, senderName = null, senderRole = 'system', senderPhotoURL = null,
  actionType = null, actionUrl = null,
}) {
  const { removeUndefined } = await import('../utils/firestoreHelpers')
  await addDoc(collection(db, 'notifications'), removeUndefined({
    recipientId,
    recipientRole,
    senderId,
    senderName,
    senderRole,
    senderPhotoURL,
    type,
    title,
    body,
    relatedId,
    relatedCollection,
    actionType,
    actionUrl,
    isRead: false,
    sentAt: serverTimestamp(),
    readAt: null,
    createdAt: serverTimestamp(),
  }))
}

/**
 * Send notifications when a class changes — to attendees + relevant coaches.
 * changeType: SCHEDULE_CHANGED | COACH_CHANGED | CLASS_CANCELLED | CAPACITY_REDUCED
 * extras: {oldCoachId, newCoachId, newCoachName, newScheduledDate, oldCoachName, senderName, senderRole, senderPhotoURL, ...}
 */
export async function notifyClassChange(classId, changeType, changedByUid, extras = {}) {
  const classSnap = await getDoc(doc(db, 'classes', classId))
  if (!classSnap.exists()) return
  const cls = classSnap.data()
  const className = cls.name || 'tu clase'
  const senderInfo = {
    senderId: changedByUid,
    senderName: extras.senderName || 'Administración SALVAJE',
    senderRole: extras.senderRole || 'admin',
    senderPhotoURL: extras.senderPhotoURL || null,
  }
  const dateStr = (() => {
    const d = cls.scheduledDate?.toDate ? cls.scheduledDate.toDate() : extras.newScheduledDate
    if (!d) return ''
    return d.toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  })()

  const attendees = cls.attendeeList || []
  const tasks = []

  if (changeType === 'SCHEDULE_CHANGED') {
    for (const a of attendees) {
      tasks.push(createNotification({
        recipientId: a.userId,
        recipientRole: 'user',
        ...senderInfo,
        type: 'class_schedule_changed',
        title: 'Cambio de horario en tu clase',
        body: `La clase "${className}" cambió de horario. Nuevo horario: ${dateStr}.`,
        relatedId: classId,
        relatedCollection: 'classes',
        actionType: 'view_class',
        actionUrl: '/app/classes',
      }))
    }
    if (cls.coachId) {
      tasks.push(createNotification({
        recipientId: cls.coachId,
        recipientRole: 'coach',
        type: 'class_schedule_changed',
        title: 'Cambio de horario en tu clase',
        body: `La clase "${className}" fue reprogramada para ${dateStr}.`,
        relatedId: classId,
        relatedCollection: 'classes',
      }))
    }
  }

  if (changeType === 'COACH_CHANGED') {
    const newCoachName = extras.newCoachName || 'otro coach'
    for (const a of attendees) {
      tasks.push(createNotification({
        recipientId: a.userId,
        recipientRole: 'user',
        type: 'class_coach_changed',
        title: 'Nuevo coach en tu clase',
        body: `La clase "${className}" ahora será dictada por ${newCoachName}.`,
        relatedId: classId,
        relatedCollection: 'classes',
      }))
    }
    if (extras.oldCoachId && extras.oldCoachId !== extras.newCoachId) {
      tasks.push(createNotification({
        recipientId: extras.oldCoachId,
        recipientRole: 'coach',
        type: 'class_coach_changed',
        title: 'Clase reasignada',
        body: `La clase "${className}" del ${dateStr} fue asignada a otro coach.`,
        relatedId: classId,
        relatedCollection: 'classes',
      }))
    }
    if (extras.newCoachId) {
      tasks.push(createNotification({
        recipientId: extras.newCoachId,
        recipientRole: 'coach',
        type: 'class_assigned',
        title: 'Nueva clase asignada',
        body: `Se te asignó la clase "${className}" el ${dateStr}.`,
        relatedId: classId,
        relatedCollection: 'classes',
      }))
    }
  }

  if (changeType === 'CLASS_CANCELLED') {
    for (const a of attendees) {
      tasks.push(createNotification({
        recipientId: a.userId,
        recipientRole: 'user',
        type: 'class_cancelled',
        title: 'Tu clase fue cancelada',
        body: `La clase "${className}" del ${dateStr} fue cancelada. ${cls.cancellationReason || ''}`.trim(),
        relatedId: classId,
        relatedCollection: 'classes',
      }))
    }
    if (cls.coachId) {
      tasks.push(createNotification({
        recipientId: cls.coachId,
        recipientRole: 'coach',
        type: 'class_cancelled',
        title: 'Clase cancelada',
        body: `La clase "${className}" del ${dateStr} fue cancelada.`,
        relatedId: classId,
        relatedCollection: 'classes',
      }))
    }
  }

  await Promise.all(tasks)
}
