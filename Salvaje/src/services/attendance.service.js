import {
  doc, getDoc, runTransaction, collection, query, where, getDocs, limit,
  Timestamp, serverTimestamp, increment, arrayUnion, addDoc, setDoc, updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { removeUndefined, firstString } from '../utils/firestoreHelpers'

const NO_SHOW_PHRASES = [
  'Faltaste hoy. Mañana es otro día. Mañana sí.',
  'Hoy te ganó la silla. Que mañana te gane el sudor.',
  'Sin excusas. Tu próximo entrenamiento te espera.',
  'Una clase perdida no es una guerra perdida. Vuelve.',
  'La tribu te extrañó. Reserva tu próxima clase.',
  'No vinimos a entrenar fácil. Reagenda y dale.',
  'El cuerpo se hace en las clases que sí cumples. Reserva la próxima.',
]

/**
 * V5 Ajuste 7: at class-finalize time, mark `hasUsedFreeTrial=true` for every
 * attendee who entered using their courtesy class. Also notifies admins.
 *
 * Idempotent: marks `courtesyConsumedAt` on the class so it won't run twice.
 */
export async function consumeCourtesyOnFinalize(classId) {
  if (!classId) return 0
  const classRef = doc(db, 'classes', classId)
  const snap = await getDoc(classRef)
  if (!snap.exists()) return 0
  const cls = snap.data()
  if (cls.courtesyConsumedAt) return 0 // idempotent

  const attendees = Array.isArray(cls.attendeeList) ? cls.attendeeList : []
  const courtesyUsers = attendees.filter((a) => a && a.userId && a.checkedIn && a.paidWithFreeTrial)
  if (courtesyUsers.length === 0) {
    try {
      await updateDoc(classRef, { courtesyConsumedAt: Timestamp.now(), updatedAt: serverTimestamp() })
    } catch {}
    return 0
  }

  let consumed = 0
  for (const a of courtesyUsers) {
    try {
      const userRef = doc(db, 'users', a.userId)
      const userSnap = await getDoc(userRef)
      if (!userSnap.exists()) continue
      const u = userSnap.data()
      // For linked members the cortesía belongs to the TITULAR, so flip the
      // flag on the titular's doc (it's their one free trial that was used).
      const flagTargetRef = u.linkedTo ? doc(db, 'users', u.linkedTo) : userRef
      const flagTargetSnap = u.linkedTo ? await getDoc(flagTargetRef) : userSnap
      if (!flagTargetSnap.exists()) continue
      if (flagTargetSnap.data().hasUsedFreeTrial) continue
      await updateDoc(flagTargetRef, {
        hasUsedFreeTrial: true,
        freeTrialUsedAt: Timestamp.now(),
        freeTrialUsedClassId: classId,
        freeTrialUsedCoachId: cls.coachId || null,
        updatedAt: serverTimestamp(),
      })
      consumed++
    } catch (e) { console.warn('consumeCourtesy update failed for', a.userId, e) }
  }

  // Mark the class so it won't double-process.
  try {
    await updateDoc(classRef, {
      courtesyConsumedAt: Timestamp.now(),
      courtesyConsumedCount: consumed,
      updatedAt: serverTimestamp(),
    })
  } catch {}

  // Notify admins (one batched message)
  if (consumed > 0) {
    try {
      const { notifyAllAdmins } = await import('./admin-notifications.service')
      await notifyAllAdmins({
        type: 'courtesy_class_used',
        title: consumed === 1 ? 'Cortesía usada' : `${consumed} cortesías usadas`,
        body: `En "${cls.name || 'la clase'}" con ${cls.coachName || 'el coach'}. Toca acá para verlas.`,
        senderId: cls.coachId || null,
        senderName: cls.coachName || null,
        senderRole: 'coach',
        relatedId: classId,
        relatedCollection: 'classes',
        actionType: 'view',
        actionUrl: '/admin/feedback',
      })
    } catch (e) { console.warn('courtesy admin notif failed:', e) }
  }

  return consumed
}

/**
 * V6 Ajuste 9 — At class finalize, create a `pendingSurveys/{userId_classId}` doc
 * for each attendee who actually checked in. The user app listens for this
 * collection and auto-pops the BattleSurveyModal on next open.
 * Idempotent via `surveysCreatedAt` flag on the class.
 */
export async function createPendingSurveysForClass(classId) {
  if (!classId) return 0
  const classRef = doc(db, 'classes', classId)
  const snap = await getDoc(classRef)
  if (!snap.exists()) return 0
  const cls = snap.data()
  if (cls.surveysCreatedAt) return 0 // idempotent

  const attendees = Array.isArray(cls.attendeeList) ? cls.attendeeList : []
  const checkedIn = attendees.filter((a) => a && a.userId && a.checkedIn)
  let count = 0

  for (const a of checkedIn) {
    const surveyId = `${a.userId}_${classId}`
    try {
      await setDoc(doc(db, 'pendingSurveys', surveyId), removeUndefined({
        userId: a.userId,
        classId,
        coachId: cls.coachId || null,
        coachName: cls.coachName || '',
        className: cls.name || '',
        classDate: cls.scheduledDate || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      }), { merge: true })
      count++
    } catch (e) { console.warn('createPendingSurvey failed for', a.userId, e) }
  }

  try {
    await updateDoc(classRef, {
      surveysCreatedAt: Timestamp.now(),
      surveysCreatedCount: count,
      updatedAt: serverTimestamp(),
    })
  } catch {}

  return count
}

/**
 * For each user who reserved but did NOT check in, send a motivational
 * notification ("no-show"). Idempotent: writes `noShowNotificationsSent: true`
 * on the class so it never fires twice.
 *
 * Safe to call from both the live finalize path and the silent auto-finalize.
 */
export async function notifyNoShowsForClass(classId) {
  if (!classId) return
  const classRef = doc(db, 'classes', classId)
  const snap = await getDoc(classRef)
  if (!snap.exists()) return
  const cls = snap.data()
  if (cls.noShowNotificationsSent) return // already sent

  const attendees = Array.isArray(cls.attendeeList) ? cls.attendeeList : []
  const noShows = attendees.filter((a) => a && a.userId && !a.checkedIn && a.reservedAt)

  // Always mark as sent (even if 0 no-shows) — avoids re-querying on reruns.
  try {
    await Promise.all(noShows.map((a, i) => {
      const body = NO_SHOW_PHRASES[i % NO_SHOW_PHRASES.length]
      return addDoc(collection(db, 'notifications'), removeUndefined({
        recipientId: a.userId,
        recipientRole: 'user',
        type: 'no_show',
        title: 'No te vimos en la clase',
        body,
        relatedId: classId,
        relatedCollection: 'classes',
        actionType: 'view',
        actionUrl: '/app/classes',
        isRead: false,
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }))
    }))
  } catch (e) { console.warn('no-show notifs failed:', e) }

  try {
    await updateDoc(classRef, {
      noShowNotificationsSent: true,
      noShowCount: noShows.length,
      updatedAt: serverTimestamp(),
    })
  } catch (e) { console.warn('mark noShowNotificationsSent failed:', e) }

  return noShows.length
}

/**
 * Determine if a user can attend a class right now, and how it should be billed.
 *
 * Tiquetera rule (V5 Ajuste 14): tickets expire 60 days after purchase
 * (`ticketeraExpDate`). Past that date, balance is treated as 0 even if it has
 * units left — they're forfeited per business rule.
 *
 * Linked-member rule: if `userData.linkedTo` is set, this function expects the
 * caller to have passed the TITULAR's data as `userData`. The transaction in
 * recordAttendance handles that lookup before calling this. Pure (no I/O).
 */
export function validateUserCanAttend(userData) {
  if (userData.isBlocked) {
    return { canAttend: false, reason: 'Usuario bloqueado', consumeFromMembership: false, consumeFromTicketera: false, consumeFreeTrial: false }
  }
  // Coach/admin granted temporary "pending payment" access
  if (userData.pendingPaymentAccess) {
    return { canAttend: true, reason: 'Acceso temporal (paga después)', consumeFromMembership: false, consumeFromTicketera: false, consumeFreeTrial: false, pendingPayment: true }
  }
  const endDate = userData.membershipEndDate?.toDate?.() || (userData.membershipEndDate ? new Date(userData.membershipEndDate) : null)
  const hasActiveMembership = userData.membershipIsActive && endDate && endDate > new Date()
  if (hasActiveMembership) {
    const daysLeft = Math.floor((endDate - new Date()) / 86400000)
    return { canAttend: true, reason: `Membresía activa · ${daysLeft} días`, consumeFromMembership: true, consumeFromTicketera: false, consumeFreeTrial: false }
  }
  // Tiquetera with explicit 60-day expiry enforcement
  const ticketsLeft = userData.ticketeraBalance || 0
  const ticketExp = userData.ticketeraExpDate?.toDate?.() || (userData.ticketeraExpDate ? new Date(userData.ticketeraExpDate) : null)
  const ticketsExpired = ticketExp && ticketExp < new Date()
  if (ticketsLeft > 0 && !ticketsExpired) {
    const daysLeft = ticketExp ? Math.max(0, Math.floor((ticketExp - new Date()) / 86400000)) : null
    const reason = daysLeft != null
      ? `Ticketera · ${ticketsLeft} clases · vence en ${daysLeft}d`
      : `Ticketera · ${ticketsLeft} clases`
    return { canAttend: true, reason, consumeFromMembership: false, consumeFromTicketera: true, consumeFreeTrial: false }
  }
  if (ticketsLeft > 0 && ticketsExpired) {
    return {
      canAttend: false,
      reason: 'Tu ticketera venció. Compra otra para seguir.',
      consumeFromMembership: false, consumeFromTicketera: false, consumeFreeTrial: false,
    }
  }
  if (!userData.hasUsedFreeTrial) {
    return { canAttend: true, reason: 'Primera clase de cortesía', consumeFromMembership: false, consumeFromTicketera: false, consumeFreeTrial: true }
  }
  return { canAttend: false, reason: 'Sin membresía activa ni ticketera', consumeFromMembership: false, consumeFromTicketera: false, consumeFreeTrial: false }
}

/**
 * Generic attendance recorder used by QR scan and phone search.
 *
 * If the user is a linked member (has `linkedTo`), validation runs against
 * the TITULAR's membership / ticketera / cortesía status. Ticketera/cortesía
 * consumption still decrements the titular's balance — this is per business
 * rule "los vinculados comparten la membresía".
 */
async function recordAttendance({ userId, classId, source }) {
  return runTransaction(db, async (tx) => {
    const userRef = doc(db, 'users', userId)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('Usuario no encontrado')
    const userData = userSnap.data()

    // Resolve titular for linked members.
    let billingRef = userRef
    let billingData = userData
    if (userData.linkedTo) {
      const titularRef = doc(db, 'users', userData.linkedTo)
      const titularSnap = await tx.get(titularRef)
      if (!titularSnap.exists()) {
        throw new Error(`${userData.displayName || 'Usuario'}: el titular ya no existe. Contacta al admin.`)
      }
      billingRef = titularRef
      billingData = titularSnap.data()
      if (billingData.isBlocked) {
        throw new Error(`${userData.displayName || 'Usuario'}: el titular del plan está bloqueado.`)
      }
    }

    const validation = validateUserCanAttend(billingData)
    if (!validation.canAttend) {
      const who = userData.linkedTo ? `${userData.displayName || 'Usuario'} (plan del titular)` : (userData.displayName || 'Usuario')
      throw new Error(`${who}: ${validation.reason}`)
    }

    const classRef = doc(db, 'classes', classId)
    const classSnap = await tx.get(classRef)
    if (!classSnap.exists()) throw new Error('Clase no encontrada')
    const cls = classSnap.data()

    const list = cls.attendeeList || []
    if (list.some((a) => a.userId === userId && a.checkedIn)) {
      throw new Error(`${userData.displayName} ya hizo check-in`)
    }

    const idx = list.findIndex((a) => a.userId === userId)
    const isReserved = idx >= 0
    const safeName = firstString(userData.displayName, userData.email, 'Usuario')

    const newEntry = removeUndefined({
      userId,
      userName: safeName,
      userPhotoURL: userData.profilePhotoURL || '',
      reservedAt: list[idx]?.reservedAt || Timestamp.now(),
      checkedIn: true,
      checkedInAt: Timestamp.now(),
      qrScanned: source === 'qr',
      manualEntry: source !== 'qr',
      walkIn: !isReserved,
      ticketeraConsumed: validation.consumeFromTicketera,
      // V5 Ajuste 7: tag entries paid with the courtesy class so we can flip
      // hasUsedFreeTrial when the coach FINALIZES the class (not at check-in).
      paidWithFreeTrial: validation.consumeFreeTrial === true,
    })

    let updatedList
    if (isReserved) {
      updatedList = [...list]
      updatedList[idx] = { ...list[idx], ...newEntry }
    } else {
      updatedList = [...list, newEntry]
    }

    tx.update(classRef, removeUndefined({
      attendeeList: updatedList,
      attendedCount: increment(1),
      currentBookings: isReserved ? cls.currentBookings : (cls.currentBookings || 0) + 1,
      updatedAt: serverTimestamp(),
    }))

    // Update user stats
    const lastClassDate = userData.lastClassDate?.toDate?.()
    const today = new Date()
    let newStreak = 1
    if (lastClassDate) {
      const diffDays = Math.floor((today.setHours(0,0,0,0) - new Date(lastClassDate).setHours(0,0,0,0)) / 86400000)
      if (diffDays === 0) newStreak = userData.currentStreak || 1
      else if (diffDays === 1) newStreak = (userData.currentStreak || 0) + 1
    }

    // V5 Ajuste 7: do NOT mark hasUsedFreeTrial here. We defer it to class
    // finalize so the courtesy is officially "consumed" once the coach
    // closes the class (not at the check-in moment).
    //
    // Stats (classesAttended, streak, lastClassDate) stay on the member's own
    // doc — each linked member has their own counters. Ticketera consumption
    // hits the titular's doc (shared balance).
    const userUpdate = removeUndefined({
      classesAttended: increment(1),
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, userData.longestStreak || 0),
      lastClassDate: Timestamp.now(),
      updatedAt: serverTimestamp(),
      ...(validation.consumeFromTicketera && !userData.linkedTo
        ? { ticketeraBalance: increment(-1) }
        : {}),
    })
    tx.update(userRef, userUpdate)

    if (userData.linkedTo && validation.consumeFromTicketera) {
      tx.update(billingRef, {
        ticketeraBalance: increment(-1),
        updatedAt: serverTimestamp(),
      })
    }

    return { userName: safeName, isReserved, validation }
  }).then(async (result) => {
    // After-effects of a successful registration. Outside the transaction
    // because notification writes don't need to be atomic with the attendance.
    if (result?.validation?.consumeFreeTrial) {
      try {
        await addDoc(collection(db, 'notifications'), removeUndefined({
          recipientId: userId,
          recipientRole: 'user',
          type: 'first_class_survey',
          title: '¿Cómo estuvo tu primera batalla?',
          body: 'Cuéntanos cómo te fue. 30 segundos · nos ayudas a mejorar y ganas reconocimiento de la tribu.',
          relatedId: classId,
          relatedCollection: 'classes',
          actionType: 'fill_survey',
          actionUrl: `/app/survey/${classId}`,
          isRead: false,
          sentAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }))
      } catch (e) { console.warn('first_class_survey notif failed:', e) }
    }
    return result
  })
}

/**
 * Pre-flight check: validates user before attempting attendance recording.
 * If user can't attend, fires a context-aware notification:
 *   - "Renueva tu plan" if they had a paid membership before (any confirmed purchase)
 *   - "Tu cortesía ya se cumplió" if they only ever used the free trial
 *   - Generic "activa tu membresía" otherwise
 * and throws a coach-friendly error.
 */
async function preflightAttendance(userId, classId) {
  const userSnap = await getDoc(doc(db, 'users', userId))
  if (!userSnap.exists()) throw new Error('Usuario no encontrado')
  const userData = userSnap.data()
  const validation = validateUserCanAttend(userData)
  if (validation.canAttend) return { userData, validation }

  const userName = firstString(userData.displayName, userData.email, 'Salvaje')

  // Decide contextual copy based on user history.
  let title, body
  let hasPaidBefore = false
  try {
    const purchasesQ = query(
      collection(db, 'membership_purchases'),
      where('userId', '==', userId),
      where('paymentStatus', '==', 'confirmed'),
      limit(1)
    )
    const ps = await getDocs(purchasesQ)
    hasPaidBefore = !ps.empty
  } catch { /* ignore */ }

  if (hasPaidBefore) {
    title = 'Tu plan se venció'
    body = 'Renueva para volver a entrenar. Te dejamos lista la pantalla de pago.'
  } else if (userData.hasUsedFreeTrial) {
    title = 'Tu clase de cortesía ya se cumplió'
    body = 'Para seguir entrenando con la tribu, activa un plan. No pagas nada extra · es lo justo para mantener el box.'
  } else {
    title = 'No pudimos registrarte en la clase'
    body = `${validation.reason}. Activa tu membresía o compra clases sueltas para entrar.`
  }

  try {
    await addDoc(collection(db, 'notifications'), removeUndefined({
      recipientId: userId,
      recipientRole: 'user',
      type: 'access_denied',
      title,
      body,
      relatedId: classId,
      relatedCollection: 'classes',
      actionType: 'view',
      actionUrl: '/app/membership',
      isRead: false,
      sentAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }))
  } catch (e) { console.warn('access_denied notif failed:', e) }

  // Throw a coach-friendly error so the scanner UI shows it.
  const err = new Error(`${userName} no está activo: ${validation.reason}`)
  err.code = 'user_not_active'
  err.userName = userName
  err.reason = validation.reason
  throw err
}

/**
 * Register attendance via QR scan (token id from /qr_tokens).
 */
export async function registerAttendanceByQR(qrToken, classId) {
  const tokenRef = doc(db, 'qr_tokens', qrToken)
  const tokenSnap = await getDoc(tokenRef)
  if (!tokenSnap.exists()) throw new Error('QR inválido')
  const token = tokenSnap.data()
  const exp = token.expiresAt?.toDate?.() || (token.expiresAt ? new Date(token.expiresAt) : null)
  if (exp && exp < new Date()) throw new Error('QR expirado')

  // Validate first; if blocked, notify user + throw before touching the class doc.
  await preflightAttendance(token.userId, classId)

  return recordAttendance({ userId: token.userId, classId, source: 'qr' })
}

/**
 * Register attendance manually (after phone search).
 */
export async function registerAttendanceManually(userId, classId) {
  await preflightAttendance(userId, classId)
  return recordAttendance({ userId, classId, source: 'manual' })
}

/**
 * V5 Ajuste 1 — Late registration with full retroactive liquidation.
 *
 * Adds a user to a class that is already finalized. Runs the SAME billing
 * as a live registration:
 *   - If membership is active → no consumption, marks `consumedFromMembership`.
 *   - Else if ticketera has balance and not expired → -1 ticket, `ticketeraConsumed`.
 *   - Else if free trial available → marks `paidWithFreeTrial` (consumed at this same call since the class is already finalized).
 *   - Else → registers anyway with `debt: true` for admin follow-up.
 *
 * Notifies admins about the retroactive entry.
 */
export async function addLateRegistration(classId, userId, coachUid) {
  const result = await runTransaction(db, async (tx) => {
    const classRef = doc(db, 'classes', classId)
    const classSnap = await tx.get(classRef)
    if (!classSnap.exists()) throw new Error('Clase no encontrada')
    const cls = classSnap.data()
    if (cls.status !== 'completed') throw new Error('Esta clase no está finalizada')

    const userRef = doc(db, 'users', userId)
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists()) throw new Error('Usuario no encontrado')
    const userData = userSnap.data()

    const list = cls.attendeeList || []
    if (list.some((a) => a.userId === userId)) {
      throw new Error(`${userData.displayName} ya estaba registrado en esta clase`)
    }

    // Run validation as if live — figure out billing source.
    const validation = validateUserCanAttend(userData)
    const safeName = firstString(userData.displayName, userData.email, 'Usuario')

    let consumedFromMembership = false
    let ticketeraConsumed = false
    let paidWithFreeTrial = false
    let debt = false

    if (validation.canAttend) {
      if (validation.consumeFromMembership) consumedFromMembership = true
      if (validation.consumeFromTicketera)  ticketeraConsumed = true
      if (validation.consumeFreeTrial)      paidWithFreeTrial = true
    } else {
      // No saldo: still register but mark debt.
      debt = true
    }

    const newEntry = removeUndefined({
      userId,
      userName: safeName,
      userPhotoURL: userData.profilePhotoURL || '',
      reservedAt: Timestamp.now(),
      checkedIn: true,
      checkedInAt: Timestamp.now(),
      qrScanned: false,
      manualEntry: true,
      lateRegistration: true,
      walkIn: true,
      consumedFromMembership,
      ticketeraConsumed,
      paidWithFreeTrial,
      debt,
      registeredByCoachUid: coachUid || null,
    })

    tx.update(classRef, {
      attendeeList: arrayUnion(newEntry),
      attendedCount: increment(1),
      updatedAt: serverTimestamp(),
    })

    // Build user update mirroring live registration (minus streaks).
    const userUpdate = removeUndefined({
      classesAttended: increment(1),
      lastClassDate: Timestamp.now(),
      updatedAt: serverTimestamp(),
      ...(ticketeraConsumed ? { ticketeraBalance: increment(-1) } : {}),
      // Free trial gets consumed immediately here (no live finalize after).
      ...(paidWithFreeTrial ? {
        hasUsedFreeTrial: true,
        freeTrialUsedAt: Timestamp.now(),
        freeTrialUsedClassId: classId,
        freeTrialUsedCoachId: coachUid || cls.coachId || null,
      } : {}),
    })
    tx.update(userRef, userUpdate)

    return { className: cls.name, coachName: cls.coachName, userName: safeName, debt, ticketeraConsumed }
  })

  // After transaction: notify admins (best-effort, outside tx).
  try {
    const { notifyAllAdmins } = await import('./admin-notifications.service')
    await notifyAllAdmins({
      type: 'retroactive_attendance',
      title: 'Asistencia retroactiva registrada',
      body: `${result.userName} fue registrado en "${result.className}" (clase ya finalizada)${result.debt ? ' · sin saldo (debt: true)' : result.ticketeraConsumed ? ' · -1 ticket' : ''}.`,
      senderId: coachUid || null,
      senderName: result.coachName || null,
      senderRole: 'coach',
      relatedId: classId,
      relatedCollection: 'classes',
      actionType: 'view',
      actionUrl: '/admin/classes',
    })
  } catch (e) { console.warn('retroactive admin notif failed:', e) }

  return result
}

/**
 * Create a "walk-in" user shadow account from the coach's phone-search flow.
 * The user can claim/complete this account later.
 */
export async function createWalkInUser({ phone, displayName, useFreeTrial = true, createdByCoachUid }) {
  const ref = doc(collection(db, 'users'))
  const referralCode = 'SALV' + ref.id.slice(0, 6).toUpperCase()
  await setDoc(ref, removeUndefined({
    uid: ref.id,
    email: `pending_${ref.id}@salvaje.app`,
    displayName: displayName.trim(),
    phone: String(phone).trim(),
    role: 'user',
    profilePhotoURL: '',
    membershipType: 'free_trial',
    membershipIsActive: true,
    hasUsedFreeTrial: false, // becomes true after the class registers
    classesAttended: 0,
    currentStreak: 0,
    longestStreak: 0,
    referralCode,
    referredBy: null,
    referralsCount: 0,
    isActive: true,
    isBlocked: false,
    isPendingRegistration: true,
    createdByCoachUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  // Create their permanent QR token
  const qrRef = doc(collection(db, 'qr_tokens'))
  await setDoc(qrRef, removeUndefined({
    id: qrRef.id,
    userId: ref.id,
    userName: displayName.trim(),
    type: 'permanent',
    classId: null,
    isUsed: false,
    isPermanent: true,
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 99 * 365 * 86400000)),
    createdAt: serverTimestamp(),
  }))
  // No use of updateDoc imported at top; inline:
  return ref.id
}
