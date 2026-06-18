/**
 * SALVAJE referrals — corrected logic per V1 spec point R.
 *
 * Flow:
 *   1. Usuario A tiene código SALV-XXXX
 *   2. Usuario B se registra con ese código → SOLO se guarda el vínculo (referredBy=A.uid). NO descuento aún.
 *   3. Usuario B hace su PRIMER pago de membresía → recibe 5% descuento automático en ese pago.
 *      Al confirmar el pago: marca a B como "ya tuvo descuento de referido" para no dárselo de nuevo.
 *   4. Cuando se confirma el pago de B (primer pago):
 *      → Si A tiene membresía activa: A.referralDiscountActive = true, percent = 10
 *      → Notificación a A: "¡[B] se unió con tu código! Tienes 10% en tu próxima renovación"
 *      → A.referralsCount += 1
 *   5. Cuando A renueva su membresía:
 *      → Sistema detecta referralDiscountActive=true y aplica 10%
 *      → Al confirmar: referralDiscountActive=false (consumido)
 */
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, increment,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { createNotification } from './notifications.service'
import { notifyAllAdmins } from './admin-notifications.service'

// V5 Ajuste 8: pricing rule
//   - New user paying with a referral code → flat price COP $120,000 on monthly plans
//     (instead of a percentage). For non-monthly plans we fall back to a 10% discount.
//   - Referrer earns a 10% discount on their next renewal once their referred
//     user makes the first PAYMENT (confirmed). 60-day validity.
//
// V6 Ajuste 14: monthly cap on accumulated referral discount.
//   - Each paid referral in the current month grants +10% to the referrer's
//     `referralDiscountPercent`, hard-capped at 30%. So 1=10%, 2=20%, 3+ = 30%.
//   - Each (referrer, referred) pair can only credit ONCE — verified at payment.
const NEW_USER_REFERRAL_FIXED_PRICE = 120000
const NEW_USER_REFERRAL_FALLBACK_PERCENT = 10
const REFERRER_DISCOUNT_PERCENT_PER_REFERRAL = 10
const REFERRER_DISCOUNT_MAX_PERCENT = 30
const DISCOUNT_VALIDITY_DAYS = 60

/**
 * Pure function — capped at 30%, 10% per paid referral. Useful for tests too.
 */
export function calculateReferralDiscountPercent(paidReferralsThisMonth) {
  const n = Math.max(0, parseInt(paidReferralsThisMonth) || 0)
  return Math.min(REFERRER_DISCOUNT_MAX_PERCENT, n * REFERRER_DISCOUNT_PERCENT_PER_REFERRAL)
}

/**
 * V7 Ajuste 2: Verifica que el referido (userId) nunca haya pagado usando el código de este referidor.
 * Un par (referidor-referido) solo puede aplicar UNA VEZ en toda la historia.
 * Lanza error si ya usaron esta combinación.
 */
export async function assertReferralPairIsFirst(userId, referrerId) {
  if (!userId || !referrerId) return
  const q = query(
    collection(db, 'membership_purchases'),
    where('userId', '==', userId),
    where('referredByUserId', '==', referrerId),
    where('paymentStatus', '==', 'confirmed')
  )
  const snaps = await getDocs(q)
  if (snaps.size > 0) {
    throw new Error(
      'Ya pagaste usando el código de referido de esta persona una vez. ' +
      'El descuento de referido solo aplica la primera vez. Elige otro código o no uses referido.'
    )
  }
}

/**
 * Find referral code doc by code string. Returns {ownerId, ownerName} or null.
 */
export async function getReferralCode(code) {
  if (!code) return null
  const ref = doc(db, 'referral_codes', code.trim().toUpperCase())
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * On registration: if user provides a referral code, link them — but DO NOT apply discount yet.
 */
export async function applyReferralOnSignup(newUserId, referralCode) {
  if (!referralCode) return null
  const ref = await getReferralCode(referralCode)
  if (!ref || !ref.isActive) return null
  if (ref.ownerId === newUserId) return null // can't refer yourself

  // Mark on user
  await updateDoc(doc(db, 'users', newUserId), {
    referredBy: ref.ownerId,
    referredByCode: ref.id,
    referralPendingFirstPayment: true,
    updatedAt: serverTimestamp(),
  })
  return ref
}

/**
 * Compute the discount applicable for a user about to pay.
 * Returns { percent, fixedPrice, reason }.
 *
 *   - referrer_reward: 10% (renewal reward, takes priority).
 *   - new_user_referral: flat $120,000 for monthly plans; 10% fallback otherwise.
 *
 * Pass `planType` (e.g. 'monthly', 'ticketera') so the caller knows whether to
 * apply the flat-price branch or the percentage branch.
 */
export async function computeApplicableDiscount(userId, planType = null) {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return { percent: 0, fixedPrice: null, reason: null }
  const u = snap.data()

  // Priority: referrer-earned 10% (renewal reward) over new-user fixed price.
  if (u.referralDiscountActive && u.referralDiscountPercent > 0) {
    const exp = u.referralDiscountExpiresAt?.toDate?.()
    if (!exp || exp > new Date()) {
      return { percent: u.referralDiscountPercent, fixedPrice: null, reason: 'referrer_reward' }
    }
  }

  if (u.referralPendingFirstPayment && u.referredBy) {
    // Monthly plan → fixed $120k. Other plans → 10% fallback.
    if (planType === 'monthly') {
      return {
        percent: 0,
        fixedPrice: NEW_USER_REFERRAL_FIXED_PRICE,
        reason: 'new_user_referral',
      }
    }
    return {
      percent: NEW_USER_REFERRAL_FALLBACK_PERCENT,
      fixedPrice: null,
      reason: 'new_user_referral',
    }
  }

  return { percent: 0, fixedPrice: null, reason: null }
}

/**
 * Called when a payment is confirmed.
 *   - If user got the new-user 5%: clear `referralPendingFirstPayment`
 *     AND give the referrer 10% credit for next renewal.
 *   - If user used the 10% reward: clear `referralDiscountActive`.
 */
export async function processReferralAfterPayment(userId, discountReason) {
  const userRef = doc(db, 'users', userId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return
  const u = snap.data()

  if (discountReason === 'referrer_reward') {
    // Consumed the 10% reward
    await updateDoc(userRef, {
      referralDiscountActive: false,
      referralDiscountPercent: 0,
      referralDiscountExpiresAt: null,
      updatedAt: serverTimestamp(),
    })
    return
  }

  if (discountReason === 'new_user_referral' && u.referredBy) {
    // Clear the pending flag for the new user
    await updateDoc(userRef, {
      referralPendingFirstPayment: false,
      updatedAt: serverTimestamp(),
    })

    // Give the referrer the 10% reward
    const referrerRef = doc(db, 'users', u.referredBy)
    const referrerSnap = await getDoc(referrerRef)
    if (referrerSnap.exists()) {
      const referrer = referrerSnap.data()

      // V6 Ajuste 14: enforce 30% monthly cap.
      // Count this referrer's paid referrals in the current calendar month.
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      let paidThisMonth = 0
      try {
        const purchasesQ = query(
          collection(db, 'membership_purchases'),
          where('paymentStatus', '==', 'confirmed'),
          where('referredByUserId', '==', u.referredBy)
        )
        const ps = await getDocs(purchasesQ)
        paidThisMonth = ps.docs.filter((d) => {
          const c = d.data().createdAt?.toDate?.() || d.data().createdAt
          if (!c) return false
          const dt = c instanceof Date ? c : new Date(c)
          return dt >= monthStart && dt <= monthEnd
        }).length
      } catch { paidThisMonth = (referrer.referralsCount || 0) + 1 }

      const newDiscountPercent = calculateReferralDiscountPercent(paidThisMonth)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + DISCOUNT_VALIDITY_DAYS)
      await updateDoc(referrerRef, {
        referralDiscountActive: true,
        referralDiscountPercent: newDiscountPercent,
        referralDiscountExpiresAt: Timestamp.fromDate(expiresAt),
        referralsCount: increment(1),
        updatedAt: serverTimestamp(),
      })

      // Update referral_codes usage
      if (u.referredByCode) {
        await updateDoc(doc(db, 'referral_codes', u.referredByCode), {
          usageCount: increment(1),
          updatedAt: serverTimestamp(),
        }).catch(() => {})
      }

      // Notify referrer
      await createNotification({
        recipientId: u.referredBy,
        recipientRole: 'user',
        type: 'referral_reward',
        title: '¡Ganaste 10% de descuento!',
        body: `${u.displayName?.split(' ')[0] || 'Tu referido'} hizo su primer pago con tu código. Tienes 10% para tu próxima renovación (válido 60 días).`,
      })

      // Notify admins
      notifyAllAdmins({
        type: 'referral_converted',
        title: 'Referido convertido',
        body: `${u.displayName || 'Un usuario'} completó su primer pago usando el código de ${referrer.displayName || 'otro usuario'}.`,
        relatedId: u.referredBy,
        relatedCollection: 'users',
        actionType: 'view_user',
        actionUrl: '/admin/users',
        senderRole: 'system',
        senderName: 'SALVAJE',
      }).catch(() => {})
    }
  }
}
