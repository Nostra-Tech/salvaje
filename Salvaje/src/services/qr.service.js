import {
  doc, getDoc, updateDoc, collection, query, where,
  getDocs, setDoc, serverTimestamp, Timestamp, limit,
} from 'firebase/firestore'
import { db } from './firebase'
import { v4 as uuidv4 } from 'uuid'

export async function getUserQRToken(userId, type = 'permanent') {
  const q = query(
    collection(db, 'qr_tokens'),
    where('userId', '==', userId),
    where('type', '==', type),
    limit(1)
  )
  const snaps = await getDocs(q)
  if (!snaps.empty) return { id: snaps.docs[0].id, ...snaps.docs[0].data() }

  // Create permanent token if not exists
  const tokenId = uuidv4()
  const expiry = new Date()
  expiry.setFullYear(expiry.getFullYear() + 99)
  const userDoc = await getDoc(doc(db, 'users', userId))
  const userName = userDoc.exists() ? userDoc.data().displayName : 'Usuario'

  await setDoc(doc(db, 'qr_tokens', tokenId), {
    id: tokenId,
    userId,
    userName,
    classId: null,
    type: 'permanent',
    expiresAt: Timestamp.fromDate(expiry),
    isUsed: false,
    usedAt: null,
    usedByClassId: null,
    createdAt: serverTimestamp(),
  })
  return { id: tokenId, userId, type: 'permanent' }
}

export async function validateQRToken(tokenId, classId) {
  const tokenSnap = await getDoc(doc(db, 'qr_tokens', tokenId))
  if (!tokenSnap.exists()) return { valid: false, error: 'QR no encontrado' }

  const token = tokenSnap.data()
  if (token.isUsed && token.type === 'class_access') return { valid: false, error: 'QR ya utilizado' }

  const now = new Date()
  const exp = token.expiresAt?.toDate ? token.expiresAt.toDate() : new Date(token.expiresAt)
  if (exp < now) return { valid: false, error: 'QR expirado' }

  return { valid: true, token }
}

export async function markTokenUsed(tokenId, classId) {
  await updateDoc(doc(db, 'qr_tokens', tokenId), {
    isUsed: true,
    usedAt: serverTimestamp(),
    usedByClassId: classId,
  })
}

export async function createClassQR(userId, classId, className) {
  const tokenId = uuidv4()
  const classSnap = await getDoc(doc(db, 'classes', classId))
  const endDate = classSnap.exists() ? classSnap.data().endDate?.toDate() : new Date()
  const expiry = new Date(endDate)
  expiry.setHours(expiry.getHours() + 2)

  const userDoc = await getDoc(doc(db, 'users', userId))
  const userName = userDoc.exists() ? userDoc.data().displayName : 'Usuario'

  await setDoc(doc(db, 'qr_tokens', tokenId), {
    id: tokenId,
    userId,
    userName,
    classId,
    type: 'class_access',
    expiresAt: Timestamp.fromDate(expiry),
    isUsed: false,
    usedAt: null,
    usedByClassId: null,
    createdAt: serverTimestamp(),
  })
  return tokenId
}
