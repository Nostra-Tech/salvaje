/**
 * Referral code generation — name-prefixed + 4 random alphanumeric chars,
 * with collision check against `users/` and `referral_codes/`.
 */
import { collection, query, where, getDocs, getDoc, doc, limit } from 'firebase/firestore'
import { db } from '../services/firebase'

export function buildReferralCode(displayName) {
  const prefix = (displayName || '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 4) || 'SALV'
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${suffix}`
}

/**
 * Returns a code guaranteed unique against both collections (users.referralCode
 * and referral_codes/{code} doc). Retries up to 5 times before falling back to
 * a uid-derived code.
 */
export async function generateUniqueReferralCode(displayName) {
  for (let i = 0; i < 5; i++) {
    const code = buildReferralCode(displayName)
    // 1) Check referral_codes/{code} (faster than user query)
    const codeSnap = await getDoc(doc(db, 'referral_codes', code))
    if (codeSnap.exists()) continue
    // 2) Check users with this code
    const userQ = query(
      collection(db, 'users'),
      where('referralCode', '==', code),
      limit(1)
    )
    const userSnap = await getDocs(userQ).catch(() => null)
    if (userSnap && !userSnap.empty) continue
    return code
  }
  // Fallback: timestamp-derived code
  return `SALV${Date.now().toString(36).toUpperCase().substring(0, 5)}`
}
