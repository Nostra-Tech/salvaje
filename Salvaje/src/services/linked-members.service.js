/**
 * Multi-member plan support (Colegio Monteluna Papás / Papás e Hijos, future Familiar).
 *
 * A "linked member" is a user whose membership is read from the titular's
 * /users/{titularUid} doc. Each linked member has:
 *   - their own Firebase Auth account (own email + password)
 *   - their own /users/{memberUid} doc with `linkedTo: titularUid`
 *   - their own QR token + achievements + streak + class history
 *
 * When a linked member tries to attend a class, attendance.service follows the
 * `linkedTo` pointer and validates against the TITULAR's membership status.
 * So when the titular's plan expires, all linked members lose access at once.
 *
 * Both REST helpers and pending_users writes happen here so creation is atomic
 * from the caller's perspective: if the Firestore write fails the orphaned
 * Auth account is self-deleted.
 */
import {
  doc, setDoc, collection, query, where, getDocs, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import { authSignUpRest, authDeleteRest } from './auth-rest.service'

/**
 * Create a single linked-member account for a titular.
 * Sends a password-reset email so the member can pick their own password.
 *
 * Returns { uid, email }.
 */
export async function createLinkedMember({
  titularUid, titularName,
  email, displayName, phone, dateOfBirth, gender,
  sendInviteEmail = true,
}) {
  if (!titularUid) throw new Error('createLinkedMember: missing titularUid')
  if (!email || !displayName) throw new Error('Email y nombre son obligatorios para cada miembro')

  const lower = email.trim().toLowerCase()
  const authData = await authSignUpRest(lower)
  const uid = authData.localId
  const idToken = authData.idToken

  try {
    // Write the linked-member pending_users doc. finalizeRegistration will
    // promote it to /users/{uid} the first time the member signs in.
    await setDoc(doc(db, 'pending_users', uid), {
      source: 'linked_member',
      email: lower,
      displayName: displayName.trim(),
      phone: (phone || '').trim(),
      dateOfBirth: dateOfBirth || null,
      birthDate: dateOfBirth || null,
      gender: gender || '',
      linkedTo: titularUid,
      titularName: titularName || '',
      // Linked members do NOT have their own membership — they read the
      // titular's. These fields stay neutral.
      membershipType: 'none',
      membershipIsActive: false,
      hasUsedFreeTrial: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    if (sendInviteEmail) {
      try {
        auth.languageCode = 'es'
        await sendPasswordResetEmail(auth, lower, {
          url: window.location.origin + '/login',
          handleCodeInApp: false,
        })
      } catch (e) { console.warn('Reset email failed for member:', e) }
    }

    return { uid, email: lower }
  } catch (err) {
    // Roll back the orphaned Auth account so the caller can retry.
    if (idToken) await authDeleteRest(idToken)
    throw err
  }
}

/**
 * Create N linked members for a titular in sequence.
 * If any one fails we throw; previously-created members stay (admin can
 * inspect and decide). Best-effort cleanup is per-member inside createLinkedMember.
 *
 * Returns the list of created { uid, email } objects.
 */
export async function createLinkedMembers({ titularUid, titularName, members }) {
  const created = []
  for (const m of (members || [])) {
    const r = await createLinkedMember({
      titularUid,
      titularName,
      email: m.email,
      displayName: m.displayName,
      phone: m.phone,
      dateOfBirth: m.dateOfBirth,
      gender: m.gender,
      sendInviteEmail: true,
    })
    created.push(r)
  }
  return created
}

/**
 * Look up all linked members for a given titular (active /users/ docs).
 */
export async function getLinkedMembers(titularUid) {
  if (!titularUid) return []
  const q = query(collection(db, 'users'), where('linkedTo', '==', titularUid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Look up linked-member pending invitations for a titular (members who
 * haven't accepted their account yet).
 */
export async function getPendingLinkedMembers(titularUid) {
  if (!titularUid) return []
  const q = query(collection(db, 'pending_users'), where('linkedTo', '==', titularUid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Validate a list of member entries before submission.
 * Returns { valid: boolean, errors: string[] }.
 *
 * - Requires displayName + email for each.
 * - Requires emails are unique within the batch.
 * - Requires count matches `requiredCount` (familySize - 1).
 */
export function validateMembersList(members, requiredCount) {
  const errors = []
  const list = Array.isArray(members) ? members : []
  if (list.length !== requiredCount) {
    errors.push(`Debes registrar ${requiredCount} miembro${requiredCount === 1 ? '' : 's'} vinculado${requiredCount === 1 ? '' : 's'}.`)
  }
  const seen = new Set()
  for (let i = 0; i < list.length; i++) {
    const m = list[i] || {}
    const label = `Miembro ${i + 1}`
    if (!m.displayName?.trim()) errors.push(`${label}: el nombre es obligatorio`)
    const e = (m.email || '').trim().toLowerCase()
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      errors.push(`${label}: ingresa un email válido`)
    } else if (seen.has(e)) {
      errors.push(`${label}: el email "${e}" se repite`)
    } else {
      seen.add(e)
    }
  }
  return { valid: errors.length === 0, errors }
}
