/**
 * Admin-only service: directly create users/coaches via Firebase Auth REST API + Firestore.
 * Uses REST API (not SDK) so admin's current session is NOT replaced by the new user's session.
 */
import {
  doc, setDoc, addDoc, collection, query, where, getDocs, getDoc, serverTimestamp,
  Timestamp, updateDoc,
} from 'firebase/firestore'
import { db, auth } from './firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import { buildAdminPendingPayload } from './registration.service'
import { authSignUpRest, authDeleteRest, generateRandomPassword } from './auth-rest.service'

/**
 * Create a NEW USER invitation:
 *   1. Auth signUp via REST (admin keeps session)
 *   2. Write /pending_users/{uid} — NOT /users/{uid}. The users doc is built
 *      later by finalizeRegistration() the first time the user signs in.
 *   3. If admin chose a membership preset, create the membership_purchase +
 *      cashflow_entry now (admin is the authenticated writer); finalize will
 *      link them onto the user doc.
 *   4. Send a password-reset email so the user can set their own password.
 *      The act of clicking that link proves email ownership for the admin path.
 */
export async function createUserDirectly({
  email, displayName, phone, dateOfBirth, gender, sendInviteEmail = true,
  membershipPreset = null, createdByUid, createdByName, colegioMonteluna = false,
}) {
  const lower = email.trim().toLowerCase()
  // 1. Create auth user (returnSecureToken:true gives us idToken for cleanup on error)
  const authData = await authSignUpRest(lower, generateRandomPassword())
  const uid = authData.localId
  const idToken = authData.idToken

  try {
    // 2. Optionally provision membership preset BEFORE the pending doc so we
    //    can carry the purchase id forward.
    let membershipExtras = {}
    if (membershipPreset?.membershipId) {
      const planSnap = await getDoc(doc(db, 'memberships_catalog', membershipPreset.membershipId))
      if (planSnap.exists()) {
        const plan = planSnap.data()
        const startDate = membershipPreset.startDate ? new Date(membershipPreset.startDate) : new Date()
        const endDate = membershipPreset.endDate
          ? new Date(membershipPreset.endDate)
          : new Date(startDate.getTime() + (plan.durationDays || 30) * 86400000)
        const planType = plan.type === 'monthly' ? 'monthly'
                       : plan.type === 'ticketera' ? 'ticketera'
                       : 'free_trial'
        const amount = membershipPreset.skipPaymentRequired ? 0 : (plan.priceAsCOP || plan.price || 0)
        const purchaseRef = await addDoc(collection(db, 'membership_purchases'), {
          userId: uid,
          email: lower,
          displayName: displayName.trim(),
          membershipId: plan.id || membershipPreset.membershipId,
          membershipType: planType,
          catalogName: plan.name,
          amount,
          amountPaid: amount,
          paymentMethod: 'admin',
          paymentStatus: 'confirmed',
          startDate: Timestamp.fromDate(startDate),
          endDate: Timestamp.fromDate(endDate),
          confirmedAt: serverTimestamp(),
          confirmedBy: createdByUid,
          notes: 'Activada manualmente al crear usuario',
          activatedManually: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        if (amount > 0) {
          await addDoc(collection(db, 'cashflow_entries'), {
            type: 'income',
            category: planType === 'ticketera' ? 'ticketera_payment' : 'membership_payment',
            description: `${plan.name} — ${displayName}`,
            amount,
            date: serverTimestamp(),
            period: new Date().toISOString().slice(0, 7),
            relatedId: purchaseRef.id,
            relatedType: 'membership_purchase',
            createdBy: createdByUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isAutomatic: true,
          })
        }
        membershipExtras = {
          membershipPurchaseId: purchaseRef.id,
          membershipType: planType,
          membershipStartDate: Timestamp.fromDate(startDate),
          membershipEndDate: Timestamp.fromDate(endDate),
          hasUsedFreeTrial: planType === 'free_trial',
          ticketeraBalance: planType === 'ticketera'
            ? (plan.classesTotal || plan.classesIncluded || 10)
            : 0,
        }
      }
    }

    // 3. Write the pending invitation. finalizeRegistration() will read this
    //    on the user's first sign-in and produce the real /users/{uid} doc.
    const pendingPayload = buildAdminPendingPayload({
      email: lower, displayName, phone, dateOfBirth, gender,
      createdByUid, createdByName, colegioMonteluna, ...membershipExtras,
    })
    await setDoc(doc(db, 'pending_users', uid), pendingPayload)

    // 4. Send password-reset email so user can set their own password.
    if (sendInviteEmail) {
      try {
        auth.languageCode = 'es'
        await sendPasswordResetEmail(auth, lower, {
          url: window.location.origin + '/login',
          handleCodeInApp: false,
        })
      } catch (e) { console.warn('Reset email failed (optional):', e) }
    }

    // 5. Notify all admins.
    try {
      const { notifyAllAdmins } = await import('./admin-notifications.service')
      await notifyAllAdmins({
        type: 'user_invited',
        title: 'Invitación enviada · nuevo usuario',
        body: `${displayName.trim()} fue invitado por ${createdByName || 'admin'}. Se completará al verificar su correo.`,
        senderId: createdByUid,
        senderName: createdByName || 'Admin',
        senderRole: 'admin',
        relatedId: uid,
        relatedCollection: 'pending_users',
        actionType: 'view_user',
        actionUrl: '/admin/users',
      })
    } catch {}

    return { uid, email: lower }
  } catch (err) {
    // Firestore or downstream step failed — self-delete the Auth account so admin can retry cleanly
    if (idToken) await authDeleteRest(idToken)
    throw err
  }
}

/**
 * Create a NEW COACH directly with auth + Firestore + reset email.
 */
export async function createCoachDirectly({
  email, displayName, phone, bio, specializations, certifications,
  hourlyRate, bankInfo, sendInviteEmail = true, createdByUid, createdByName,
}) {
  const lower = email.trim().toLowerCase()
  const authData = await authSignUpRest(lower, generateRandomPassword())
  const uid = authData.localId
  const idToken = authData.idToken

  try {
  await setDoc(doc(db, 'coaches', uid), {
    uid,
    email: lower,
    displayName: displayName.trim(),
    phone: phone?.trim() || '',
    bio: bio?.trim() || '',
    specializations: specializations || [],
    certifications: certifications || [],
    hourlyRate: parseInt(hourlyRate) || 0,
    bankInfo: bankInfo || null,
    isActive: true,
    isBlocked: false,
    profilePhotoURL: '',
    availableSchedule: {},
    totalClassesTaught: 0,
    totalHoursTaught: 0,
    totalEarnedHistoric: 0,
    rating: 0,
    createdBy: createdByUid,
    createdByName,
    createdManuallyByAdmin: true,
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
    } catch (e) { console.warn('Reset email failed (optional):', e) }
  }

  return { uid, email: lower }
  } catch (err) {
    if (idToken) await authDeleteRest(idToken)
    throw err
  }
}

/**
 * Manually activate a membership for an existing user.
 */
export async function activateMembershipManually({
  userId, userEmail, userName, membershipId, membershipType, catalogName,
  amountPaid, startDate, endDate, paymentMethod, ticketeraTotal, notes, adminUid, adminName,
}) {
  const purchaseRef = await addDoc(collection(db, 'membership_purchases'), {
    userId,
    email: userEmail,
    displayName: userName,
    membershipId,
    membershipType,
    catalogName,
    amount: amountPaid,
    amountPaid,
    paymentMethod,
    paymentStatus: 'confirmed',
    startDate: Timestamp.fromDate(startDate),
    endDate: endDate ? Timestamp.fromDate(endDate) : null,
    confirmedAt: serverTimestamp(),
    confirmedBy: adminUid,
    notes: notes || '',
    activatedManually: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const userUpdate = {
    membershipType,
    membershipIsActive: true,
    membershipStartDate: Timestamp.fromDate(startDate),
    membershipEndDate: endDate ? Timestamp.fromDate(endDate) : null,
    activeMembershipPurchaseId: purchaseRef.id,
    updatedAt: serverTimestamp(),
  }
  if (membershipType === 'free_trial') userUpdate.hasUsedFreeTrial = true
  if (membershipType === 'ticketera' && ticketeraTotal) userUpdate.ticketeraBalance = ticketeraTotal
  await updateDoc(doc(db, 'users', userId), userUpdate)

  if (membershipType === 'ticketera' && ticketeraTotal) {
    await addDoc(collection(db, 'ticketeras'), {
      userId, email: userEmail, displayName: userName, membershipId,
      classesTotal: ticketeraTotal, classesUsed: 0, classesRemaining: ticketeraTotal,
      expiryDate: endDate ? endDate.toISOString().slice(0, 10) : null,
      isActive: true, usageHistory: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
  }

  if (amountPaid > 0) {
    await addDoc(collection(db, 'cashflow_entries'), {
      type: 'income',
      category: membershipType === 'ticketera' ? 'ticketera_payment' : 'membership_payment',
      description: `${catalogName || 'Membresía'} — ${userName || userEmail || 'Usuario'}`,
      amount: amountPaid,
      date: serverTimestamp(),
      period: new Date().toISOString().slice(0, 7),
      relatedId: purchaseRef.id,
      relatedType: 'membership_purchase',
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAutomatic: true,
    })
  }

  // Notify the user that their membership was activated by admin.
  try {
    const planLabel = membershipType === 'ticketera'
      ? `Ticketera de ${ticketeraTotal || 12} clases`
      : membershipType === 'free_trial'
      ? 'Cortesía'
      : catalogName || 'Membresía'
    await addDoc(collection(db, 'notifications'), {
      recipientId: userId,
      recipientRole: 'user',
      senderId: adminUid || null,
      senderName: adminName || 'Administración SALVAJE',
      senderRole: 'admin',
      type: 'membership_activated',
      title: 'Tu membresía está activa',
      body: `${planLabel} cargada por ${adminName || 'el admin'}. Ya puedes reservar tu próxima clase.`,
      relatedId: purchaseRef.id,
      relatedCollection: 'membership_purchases',
      actionType: 'view',
      actionUrl: '/app/membership',
      isRead: false,
      sentAt: serverTimestamp(),
      readAt: null,
      createdAt: serverTimestamp(),
    })
  } catch (e) { console.warn('membership notif failed:', e) }

  return purchaseRef.id
}
