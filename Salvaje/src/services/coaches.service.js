import {
  doc, getDoc, collection, getDocs, updateDoc,
  serverTimestamp, onSnapshot, query, orderBy,
} from 'firebase/firestore'
import { db } from './firebase'

export async function getCoachById(uid) {
  const snap = await getDoc(doc(db, 'coaches', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function subscribeToCoach(uid, callback) {
  return onSnapshot(doc(db, 'coaches', uid), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
    else callback(null)
  })
}

export async function getAllCoaches() {
  const snaps = await getDocs(collection(db, 'coaches'))
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function updateCoach(uid, data) {
  await updateDoc(doc(db, 'coaches', uid), { ...data, updatedAt: serverTimestamp() })
}
