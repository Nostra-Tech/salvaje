import {
  collection, getDocs, getDoc, doc, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, Timestamp, runTransaction, increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { PAYMENT_STATUS, MEMBERSHIP_TYPES } from '../utils/constants'
import { removeUndefined, firstString } from '../utils/firestoreHelpers'

export async function getMembershipCatalog() {
  const q = query(collection(db, 'memberships_catalog'), where('isActive', '==', true))
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, priceAsCOP: data.price ?? 0 }
  })
}

export async function getUserPurchases(userId) {
  const q = query(
    collection(db, 'membership_purchases'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPendingPayments() {
  const q = query(
    collection(db, 'membership_purchases'),
    where('paymentStatus', '==', PAYMENT_STATUS.PENDING),
    orderBy('createdAt', 'desc')
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getAllPurchases() {
  const q = query(collection(db, 'membership_purchases'), orderBy('createdAt', 'desc'))
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * V6 Ajuste 4 — Anticipated renewal logic.
 *
 * Decides when a new membership should start when the user already has an
 * active one:
 *   - Tiquetera + buying tiquetera again: BLOCK if there are tickets remaining
 *     and the current ticketera hasn't expired (returns canBuy:false).
 *   - Monthly (or any plan with `membershipEndDate` in the future):
 *     the new plan starts the day AFTER the current one expires.
 *   - Otherwise (no active plan / expired): starts today.
 *
 * Returns: { canBuy, startDate, isRenewal, reason, currentExpiresAt }
 */
export async function computeRenewalStartDate(userId, planType) {
  const userSnap = await getDoc(doc(db, 'users', userId))
  if (!userSnap.exists()) {
    return { canBuy: true, startDate: new Date(), isRenewal: false }
  }
  const u = userSnap.data()
  const now = new Date()

  if (planType === 'ticketera') {
    const ticketsLeft = u.ticketeraBalance || 0
    const exp = u.ticketeraExpDate?.toDate?.() || (u.ticketeraExpDate ? new Date(u.ticketeraExpDate) : null)
    const stillVigente = exp && exp > now
    if (ticketsLeft > 0 && stillVigente) {
      return {
        canBuy: false,
        reason: `Aún tienes ${ticketsLeft} clases en tu ticketera vigente (vence ${exp.toLocaleDateString('es-CO')}). Úsalas o espera a que venza.`,
        currentExpiresAt: exp,
      }
    }
    return { canBuy: true, startDate: new Date(), isRenewal: false }
  }

  // Monthly / others
  const end = u.membershipEndDate?.toDate?.() || (u.membershipEndDate ? new Date(u.membershipEndDate) : null)
  if (u.membershipIsActive && end && end > now) {
    const start = new Date(end)
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
    return { canBuy: true, startDate: start, isRenewal: true, currentExpiresAt: end }
  }
  return { canBuy: true, startDate: new Date(), isRenewal: false }
}

/**
 * Re-validation request: when admin hasn't validated a pending payment yet
 * and the user wants to nudge them. Updates the purchase doc + notifies admins.
 *
 * Rate-limited to 1 request per 24h per purchase to avoid spam, and explicitly
 * does NOT create a duplicate purchase or charge.
 */
export async function requestRevalidation(purchaseId, userInfo = {}) {
  const purchaseRef = doc(db, 'membership_purchases', purchaseId)
  const snap = await getDoc(purchaseRef)
  if (!snap.exists()) throw new Error('Compra no encontrada')
  const purchase = snap.data()

  if (purchase.paymentStatus !== PAYMENT_STATUS.PENDING) {
    throw new Error('Este pago ya fue procesado')
  }

  // Rate-limit: 1 request per 24h
  const lastReq = purchase.lastRevalidationRequestAt?.toDate?.()
  if (lastReq && (Date.now() - lastReq.getTime()) < 24 * 60 * 60 * 1000) {
    const hours = Math.ceil(24 - (Date.now() - lastReq.getTime()) / 3600000)
    throw new Error(`Ya pediste re-validación hace poco. Intenta de nuevo en ~${hours}h.`)
  }

  // Update the purchase doc — bumps a counter so admin can see how many times asked.
  await updateDoc(purchaseRef, {
    lastRevalidationRequestAt: serverTimestamp(),
    revalidationRequestCount: increment(1),
    updatedAt: serverTimestamp(),
  })

  // Fire-and-forget admin notification.
  ;(async () => {
    try {
      const { notifyAllAdmins } = await import('./admin-notifications.service')
      const senderName = firstString(userInfo.userName, purchase.userName, purchase.userEmail, 'Salvaje')
      const formatCOP = (n) => '$' + (n || 0).toLocaleString('es-CO')
      await notifyAllAdmins({
        type: 'payment_revalidation_request',
        title: `${senderName} pidió re-validación`,
        body: `Su pago de ${formatCOP(purchase.amountPaid || purchase.amount)} (${purchase.catalogName || 'plan'}) sigue pendiente. Re-revísalo cuando puedas.`,
        senderId: purchase.userId,
        senderName,
        senderRole: 'user',
        senderPhotoURL: userInfo.userPhotoURL || purchase.userPhotoURL || null,
        relatedId: purchaseId,
        relatedCollection: 'membership_purchases',
        actionType: 'approve_payment',
        actionUrl: '/admin/payments',
      })
    } catch (e) { console.warn('revalidation notif failed:', e) }
  })()

  return true
}

export async function createPurchase(data) {
  const ref = await addDoc(collection(db, 'membership_purchases'), {
    ...data,
    paymentStatus: PAYMENT_STATUS.PENDING,
    createdAt: serverTimestamp(),
  })

  // Notify admins — fire-and-forget so the user-facing flow returns quickly.
  ;(async () => {
    try {
      const { notifyAllAdmins } = await import('./admin-notifications.service')
      const senderName = firstString(data.userName, data.displayName, data.email, 'Usuario')
      const formatCOP = (n) => '$' + (n || 0).toLocaleString('es-CO')
      await notifyAllAdmins({
        type: 'payment_pending',
        title: 'Nuevo pago pendiente de validación',
        body: `${senderName} subió un comprobante por ${formatCOP(data.amountPaid || data.amount)} (${data.catalogName || 'Membresía'}). Método: ${data.paymentMethod || 'no especificado'}`,
        senderId: data.userId,
        senderName,
        senderRole: 'user',
        senderPhotoURL: data.userPhotoURL || null,
        relatedId: ref.id,
        relatedCollection: 'membership_purchases',
        actionType: 'approve_payment',
        actionUrl: '/admin/payments',
      })
    } catch (e) { console.warn('notifyAllAdmins (createPurchase) failed:', e) }
  })()

  return ref.id
}

export async function confirmPayment(purchaseId, adminId, adminName) {
  // Look up the catalog entry once outside the transaction so we know the
  // plan's actual durationDays / expiryDays / classesTotal. The old code
  // hardcoded 30 days for monthly and 60 for ticketera, which breaks
  // Trimestre/Semestre/Anualidad and the 30-day Tiquetera.
  let catalogPlan = null
  try {
    const purchasePeek = await getDoc(doc(db, 'membership_purchases', purchaseId))
    const peek = purchasePeek.exists() ? purchasePeek.data() : null
    const planId = peek?.catalogId || peek?.membershipId
    if (planId) {
      const planSnap = await getDoc(doc(db, 'memberships_catalog', planId))
      if (planSnap.exists()) catalogPlan = { id: planSnap.id, ...planSnap.data() }
    }
  } catch (e) { console.warn('catalog lookup failed:', e) }

  await runTransaction(db, async (tx) => {
    const purchaseRef = doc(db, 'membership_purchases', purchaseId)
    const purchaseSnap = await tx.get(purchaseRef)
    if (!purchaseSnap.exists()) throw new Error('Compra no encontrada')
    const purchase = purchaseSnap.data()

    const userRef = doc(db, 'users', purchase.userId)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('Usuario no encontrado')

    const now = Timestamp.now()
    // V6 Ajuste 4 — honor a deferred start date if the purchase is a renewal.
    const requestedStart = purchase.requestedStartDate?.toDate?.() ||
      (purchase.requestedStartDate ? new Date(purchase.requestedStartDate) : null)
    const startDateValue = requestedStart && requestedStart > new Date()
      ? Timestamp.fromDate(requestedStart)
      : now
    const startDate = startDateValue
    let endDate = null
    const startDateAsJS = startDateValue.toDate ? startDateValue.toDate() : new Date()

    // Honor the catalog's actual duration. Falls back to 30 days only if the
    // catalog lookup failed AND the purchase didn't carry a duration.
    const monthlyDays = catalogPlan?.durationDays
      ?? purchase.durationDays
      ?? 30
    if (purchase.membershipType === MEMBERSHIP_TYPES.MONTHLY) {
      const end = new Date(startDateAsJS)
      end.setDate(end.getDate() + monthlyDays)
      endDate = Timestamp.fromDate(end)
    }

    // Resolve canonical user name + email — never undefined
    const userData = userSnap.data()
    const safeName = firstString(
      userData.displayName,
      purchase.displayName,
      purchase.userName,
      userData.email,
      purchase.email,
      'Usuario sin nombre'
    )
    const safeEmail = firstString(userData.email, purchase.email, '')

    // Update purchase
    tx.update(purchaseRef, removeUndefined({
      paymentStatus: PAYMENT_STATUS.CONFIRMED,
      confirmedAt: now,
      confirmedBy: adminId,
    }))

    // Update user membership
    const userUpdate = {
      membershipType: purchase.membershipType,
      membershipIsActive: true,
      membershipStartDate: startDate,
      membershipEndDate: endDate,
      activeMembershipPurchaseId: purchaseId,
      updatedAt: now,
    }

    // Auto-unblock if the user was blocked for non-payment
    if (userData.isBlocked && userData.blockType === 'non_payment') {
      userUpdate.isBlocked = false
      userUpdate.blockReason = ''
      userUpdate.blockType = null
      userUpdate.blockedAt = null
      userUpdate.unblockRequested = false
      userUpdate.classAccessRequested = false
    }

    if (purchase.membershipType === MEMBERSHIP_TYPES.FREE_TRIAL) {
      userUpdate.hasUsedFreeTrial = true
    }

    // Ticketera: pull classesTotal + expiryDays from the catalog so each plan
    // (Tiquetera 12 = 30 días, Pase Día = 1 día, etc.) gets its real values.
    const ticketeraTotal = catalogPlan?.classesTotal
      ?? catalogPlan?.classesIncluded
      ?? purchase.classesTotal
      ?? 12
    const ticketeraExpiryDays = catalogPlan?.expiryDays
      ?? catalogPlan?.durationDays
      ?? purchase.expiryDays
      ?? 30
    if (purchase.membershipType === MEMBERSHIP_TYPES.TICKETERA) {
      // V5 Ajuste 14 → ahora derivado del catálogo (no hardcoded).
      // V7: si el usuario ya tenía saldo vigente (no debería por computeRenewalStartDate,
      // pero por defensa), se acumula en vez de sobrescribir.
      const currentBalance = userData.ticketeraBalance || 0
      const currentExp = userData.ticketeraExpDate?.toDate?.() || null
      const stillVigente = currentExp && currentExp > new Date() && currentBalance > 0
      userUpdate.ticketeraBalance = stillVigente
        ? currentBalance + ticketeraTotal
        : ticketeraTotal
      userUpdate.membershipIsActive = false
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + ticketeraExpiryDays)
      userUpdate.ticketeraExpDate = Timestamp.fromDate(expiry)
    }

    tx.update(userRef, removeUndefined(userUpdate))

    // Create ticketera if needed
    if (purchase.membershipType === MEMBERSHIP_TYPES.TICKETERA) {
      const total = ticketeraTotal
      const ticketeraRef = doc(collection(db, 'ticketeras'))
      tx.set(ticketeraRef, removeUndefined({
        id: ticketeraRef.id,
        userId: purchase.userId,
        userName: safeName,
        userEmail: safeEmail,
        displayName: safeName,
        email: safeEmail,
        membershipId: purchase.membershipId || null,
        purchaseId,
        totalClasses: total,
        classesTotal: total,
        classesUsed: 0,
        classesRemaining: total,
        isActive: true,
        isExpired: false,
        usageHistory: [],
        // V5 Ajuste 14: 60-day expiry on the tiquetera doc as well.
        expiresAt: userUpdate.ticketeraExpDate,
        createdAt: now,
        updatedAt: now,
      }))
    }
  })

  // After transaction: log income to cashflow + process referrals
  try {
    const purchaseSnap = await getDoc(doc(db, 'membership_purchases', purchaseId))
    if (purchaseSnap.exists()) {
      const purchase = purchaseSnap.data()
      const amount = purchase.amountPaid || purchase.amount || 0
      if (amount > 0) {
        const { logIncomeFromPayment } = await import('./cashflow.service')
        await logIncomeFromPayment({
          purchaseId,
          amount,
          description: `${purchase.catalogName || 'Membresía'} — ${purchase.displayName || purchase.email}`,
          adminUid: adminId,
        })
      }
      // Process referrals
      if (purchase.discountReason) {
        const { processReferralAfterPayment } = await import('./referrals.service')
        await processReferralAfterPayment(purchase.userId, purchase.discountReason)
      }
      // Notify USER that their payment was confirmed
      try {
        const { createNotification } = await import('./notifications.service')
        await createNotification({
          recipientId: purchase.userId,
          recipientRole: 'user',
          senderId: adminId,
          senderName: adminName || 'Administración SALVAJE',
          senderRole: 'admin',
          senderPhotoURL: null,
          type: 'payment_confirmed',
          title: 'Tu pago fue confirmado',
          body: `Tu ${purchase.catalogName || 'membresía'} ya está activa. ¡Bienvenido salvaje!`,
          relatedId: purchaseId,
          relatedCollection: 'membership_purchases',
          actionType: 'view',
          actionUrl: '/app/membership',
        })
      } catch {}
      // V6 Ajuste 12 — re-evaluate achievements (could unlock first_membership).
      try {
        const { checkAndUnlockAchievements } = await import('./achievements.service')
        await checkAndUnlockAchievements(purchase.userId)
      } catch {}
    }
  } catch (e) { /* swallow */ }
}

export async function rejectPayment(purchaseId, reason, adminId, adminName) {
  await updateDoc(doc(db, 'membership_purchases', purchaseId), {
    paymentStatus: PAYMENT_STATUS.REJECTED,
    rejectionReason: reason,
    rejectedBy: adminId || null,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  // Notify user
  try {
    const purchaseSnap = await getDoc(doc(db, 'membership_purchases', purchaseId))
    if (purchaseSnap.exists()) {
      const purchase = purchaseSnap.data()
      const { createNotification } = await import('./notifications.service')
      await createNotification({
        recipientId: purchase.userId,
        recipientRole: 'user',
        senderId: adminId || null,
        senderName: adminName || 'Administración SALVAJE',
        senderRole: 'admin',
        type: 'payment_rejected',
        title: 'Tu pago fue rechazado',
        body: `${reason || 'Por favor revisa el comprobante e intenta de nuevo.'}`,
        relatedId: purchaseId,
        relatedCollection: 'membership_purchases',
        actionType: 'view',
        actionUrl: '/app/membership',
      })
    }
  } catch {}
}

export async function getAppConfig() {
  const snap = await getDoc(doc(db, 'app_config', 'main'))
  return snap.exists() ? snap.data() : null
}

export async function updateAppConfig(data) {
  await updateDoc(doc(db, 'app_config', 'main'), { ...data, updatedAt: serverTimestamp() })
}
