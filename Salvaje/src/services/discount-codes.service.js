/**
 * V5 Ajuste 19 — Admin-managed discount codes.
 *
 * Schema (collection `discountCodes`):
 *   id (= the code itself, uppercased), type ('fixed'|'percentage'),
 *   value (number), maxUses (number|null), usedCount (number),
 *   assignedToUserId (string|null), validFrom (Timestamp), validUntil (Timestamp|null),
 *   isActive (bool), createdBy, createdAt, updatedAt
 */
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp, increment,
} from 'firebase/firestore'
import { db } from './firebase'

export async function listDiscountCodes() {
  const snap = await getDocs(query(collection(db, 'discountCodes'), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function upsertDiscountCode(code, data, adminUid) {
  const id = (code || '').trim().toUpperCase()
  if (!id) throw new Error('El código no puede estar vacío')
  if (!/^[A-Z0-9-]{3,20}$/.test(id)) throw new Error('Solo letras, números o guion (3-20 chars)')

  const ref = doc(db, 'discountCodes', id)
  const existing = await getDoc(ref)
  await setDoc(ref, {
    ...(existing.exists() ? existing.data() : { usedCount: 0, createdAt: serverTimestamp(), createdBy: adminUid }),
    code: id,
    type: data.type || 'fixed',
    value: Number(data.value) || 0,
    maxUses: data.maxUses ? Number(data.maxUses) : null,
    assignedToUserId: data.assignedToUserId || null,
    validFrom: data.validFrom ? Timestamp.fromDate(new Date(data.validFrom)) : Timestamp.now(),
    validUntil: data.validUntil ? Timestamp.fromDate(new Date(data.validUntil)) : null,
    isActive: data.isActive !== false,
    notes: data.notes || '',
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  }, { merge: true })
  return id
}

export async function setDiscountCodeActive(code, isActive) {
  await updateDoc(doc(db, 'discountCodes', code), {
    isActive,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteDiscountCode(code) {
  await deleteDoc(doc(db, 'discountCodes', code))
}

/**
 * Validate a code in the context of a user + plan price. Returns:
 *   { valid: true, savings, finalPrice, code }  if usable
 *   { valid: false, reason }                    otherwise
 */
export async function validateDiscountCode(rawCode, { userId, basePrice }) {
  const id = (rawCode || '').trim().toUpperCase()
  if (!id) return { valid: false, reason: 'Ingresa un código' }
  const snap = await getDoc(doc(db, 'discountCodes', id))
  if (!snap.exists()) return { valid: false, reason: 'Código no válido' }
  const c = snap.data()
  if (!c.isActive) return { valid: false, reason: 'Este código está desactivado' }

  const now = new Date()
  const from = c.validFrom?.toDate?.()
  const until = c.validUntil?.toDate?.()
  if (from && from > now) return { valid: false, reason: 'Este código aún no está vigente' }
  if (until && until < now) return { valid: false, reason: 'Este código ya venció' }
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { valid: false, reason: 'Este código ya alcanzó su máximo de usos' }
  if (c.assignedToUserId && c.assignedToUserId !== userId) return { valid: false, reason: 'Este código no es para tu cuenta' }

  const savings = c.type === 'fixed'
    ? Math.min(c.value || 0, basePrice)
    : Math.floor((basePrice * (c.value || 0)) / 100)
  const finalPrice = Math.max(0, basePrice - savings)

  return { valid: true, savings, finalPrice, code: { ...c, id } }
}

/**
 * Increment usedCount (after a payment is created using the code).
 */
export async function bumpDiscountCodeUsage(code) {
  if (!code) return
  await updateDoc(doc(db, 'discountCodes', code), {
    usedCount: increment(1),
    updatedAt: serverTimestamp(),
  })
}
