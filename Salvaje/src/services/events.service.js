import {
  collection, query, where, orderBy, getDocs, getDoc, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp, runTransaction,
  onSnapshot, Timestamp, increment, arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { db } from './firebase'
import { notifyAllUsers } from './admin-notifications.service'

export async function createEvent(data) {
  const ref = await addDoc(collection(db, 'events'), {
    ...data,
    registeredCount: 0,
    registeredList: [],
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEvent(id, data) {
  await updateDoc(doc(db, 'events', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteEvent(id) {
  await deleteDoc(doc(db, 'events', id))
}

export async function publishEvent(id) {
  const eventRef = doc(db, 'events', id)
  const snap = await getDoc(eventRef)
  if (!snap.exists()) throw new Error('Evento no encontrado')
  const event = snap.data()

  await updateDoc(eventRef, { status: 'published', updatedAt: serverTimestamp() })

  const eventDate = event.date?.toDate?.() || new Date(event.date)
  const formattedDate = eventDate.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  notifyAllUsers({
    type: 'new_event',
    title: `¡Nuevo evento! ${event.title}`,
    body: `Fecha: ${formattedDate}. ¡Inscríbete antes de que se llene!`,
    relatedId: id,
    relatedCollection: 'events',
    actionType: 'view',
    actionUrl: '/app/events',
    senderRole: 'system',
    senderName: 'Salvaje',
  }).catch(() => {})
}

export async function unpublishEvent(id) {
  await updateDoc(doc(db, 'events', id), { status: 'draft', updatedAt: serverTimestamp() })
}

export function subscribeToAllEvents(callback) {
  const q = query(collection(db, 'events'), orderBy('date', 'asc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.warn('[events] subscribeToAllEvents error:', err); callback([]) }
  )
}

export function subscribeToPublishedEvents(callback) {
  const q = query(
    collection(db, 'events'),
    where('status', '==', 'published'),
    orderBy('date', 'asc')
  )
  return onSnapshot(
    q,
    (snap) => {
      const now = new Date()
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((ev) => {
          const d = ev.date?.toDate?.() || new Date(ev.date)
          return d >= now
        })
      callback(docs)
    },
    (err) => { console.warn('[events] subscribeToPublishedEvents error:', err); callback([]) }
  )
}

export async function registerForEvent(eventId, user) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'events', eventId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Evento no encontrado')
    const event = snap.data()
    if (event.registeredCount >= event.capacity) throw new Error('Evento lleno')
    const alreadyIn = event.registeredList?.some((r) => r.userId === user.uid)
    if (alreadyIn) throw new Error('Ya estás inscrito en este evento')
    const attendee = {
      userId: user.uid,
      userName: user.displayName || user.email,
      userPhotoURL: user.profilePhotoURL || '',
      registeredAt: Timestamp.now(),
    }
    tx.update(ref, {
      registeredList: arrayUnion(attendee),
      registeredCount: increment(1),
      updatedAt: Timestamp.now(),
    })
  })
}

export async function unregisterFromEvent(eventId, userId) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'events', eventId)
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Evento no encontrado')
    const event = snap.data()
    const attendee = event.registeredList?.find((r) => r.userId === userId)
    if (!attendee) throw new Error('No estás inscrito en este evento')
    tx.update(ref, {
      registeredList: arrayRemove(attendee),
      registeredCount: increment(-1),
      updatedAt: Timestamp.now(),
    })
  })
}
