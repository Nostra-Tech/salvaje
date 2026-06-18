/**
 * Registration finalization.
 *
 * Both self-signup and admin-create paths write to /pending_users/{uid} on
 * initial submission. The /users/{uid} doc is created HERE — only after the
 * user proves email ownership (either by clicking the verification link, or
 * by setting their password via the admin-issued reset email). Keeps the
 * /users collection clean of unverified accounts.
 */
import {
  doc, getDoc, setDoc, deleteDoc, collection, addDoc, serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db } from './firebase'
import { generateUniqueReferralCode } from '../utils/referral'

/**
 * Reads pending_users/{uid}, writes the full users/{uid} doc with the same
 * shape that registerUser used to produce, creates the side-effect docs
 * (referral code, QR token, welcome notification, admin notification), then
 * deletes the pending doc. Idempotent — if users/{uid} already exists, exits.
 */
export async function finalizeRegistration(uid) {
  if (!uid) throw new Error('finalizeRegistration: missing uid')

  // Skip if user doc already exists (idempotency / safety).
  const userSnap = await getDoc(doc(db, 'users', uid))
  if (userSnap.exists()) return { alreadyFinalized: true }

  const pendingSnap = await getDoc(doc(db, 'pending_users', uid))
  if (!pendingSnap.exists()) {
    throw new Error('No pending registration found for this user')
  }
  const pending = pendingSnap.data()

  const myReferralCode = await generateUniqueReferralCode(pending.displayName || 'salvaje')

  const baseBirthDate = pending.dateOfBirth || pending.birthDate || null
  const birthTs = baseBirthDate
    ? Timestamp.fromDate(new Date(baseBirthDate))
    : null

  // Same shape as registerUser used to write directly.
  const userData = {
    uid,
    email: pending.email,
    displayName: pending.displayName,
    phone: pending.phone || '',
    dateOfBirth: birthTs,
    birthDate: birthTs,
    gender: pending.gender || '',
    emergencyContact: '',
    emergencyPhone: '',
    profilePhotoURL: '',
    role: 'user',
    membershipType: pending.membershipType || 'none',
    membershipStartDate: pending.membershipStartDate || null,
    membershipEndDate: pending.membershipEndDate || null,
    membershipIsActive: !!pending.membershipIsActive,
    hasUsedFreeTrial: !!pending.hasUsedFreeTrial,
    activeMembershipPurchaseId: pending.activeMembershipPurchaseId || null,
    ticketeraId: null,
    ticketeraBalance: pending.ticketeraBalance || 0,
    ticketeraExpDate: pending.ticketeraExpDate || null,
    referralCode: myReferralCode,
    referredBy: null,
    referralsCount: 0,
    referralDiscountAvailable: false,
    classesAttended: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastClassDate: null,
    unlockedAchievements: [],
    isActive: true,
    isBlocked: false,
    blockReason: '',
    colegioMonteluna: !!pending.colegioMonteluna,
    // Linked-member relationship: when set, attendance.service reads the
    // titular's membership instead of this user's own.
    ...(pending.linkedTo ? {
      linkedTo: pending.linkedTo,
      titularName: pending.titularName || '',
    } : {}),
    createdAt: pending.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    enableEmailNotifications: true,
    enablePushNotifications: false,
    fcmToken: null,
    // Admin-vouched provenance (for support / audit).
    ...(pending.source === 'admin' ? {
      createdBy: pending.createdBy || null,
      createdByName: pending.createdByName || null,
      createdManuallyByAdmin: true,
    } : {}),
  }

  await setDoc(doc(db, 'users', uid), userData)

  // Referral code doc (owner-authored). Owner is the new user themselves.
  await setDoc(doc(db, 'referral_codes', myReferralCode), {
    code: myReferralCode,
    ownerId: uid,
    ownerName: pending.displayName || '',
    discountPercent: 10,
    usageCount: 0,
    usedBy: [],
    isActive: true,
    createdAt: serverTimestamp(),
  })

  // Permanent QR token (99-year expiry as before).
  const tokenId = uuidv4()
  const expiry = new Date()
  expiry.setFullYear(expiry.getFullYear() + 99)
  await setDoc(doc(db, 'qr_tokens', tokenId), {
    id: tokenId,
    userId: uid,
    userName: pending.displayName || '',
    classId: null,
    type: 'permanent',
    expiresAt: expiry,
    isUsed: false,
    usedAt: null,
    usedByClassId: null,
    createdAt: serverTimestamp(),
  })

  // Welcome notification (in-app). If admin pre-assigned a membership, lead
  // with that instead of the generic free-trial copy.
  try {
    const hasPresetMembership = !!(pending.activeMembershipPurchaseId || pending.membershipIsActive)
    let title = 'Bienvenido a la tribu'
    let body = '¡Ya eres parte de SALVAJE! Tu primera clase de cortesía está lista.'
    if (hasPresetMembership) {
      const planLabel = pending.membershipType === 'ticketera'
        ? `Ticketera (${pending.ticketeraBalance || 12} clases)`
        : pending.membershipType === 'monthly'
        ? 'Membresía mensual ilimitada'
        : 'Membresía'
      title = 'Tu membresía está activa'
      body = `${planLabel} cargada por el admin. Entra al box y reserva tu primera clase.`
    }
    await addDoc(collection(db, 'notifications'), {
      recipientId: uid,
      recipientRole: 'user',
      type: hasPresetMembership ? 'membership_activated' : 'welcome',
      title,
      body,
      relatedId: pending.activeMembershipPurchaseId || null,
      relatedCollection: pending.activeMembershipPurchaseId ? 'membership_purchases' : null,
      isRead: false,
      sentAt: serverTimestamp(),
      readAt: null,
      createdAt: serverTimestamp(),
    })
  } catch (e) { console.warn('welcome notif failed:', e) }

  // Link referral if the pending doc carried one.
  if (pending.referralCode) {
    try {
      const { applyReferralOnSignup } = await import('./referrals.service')
      await applyReferralOnSignup(uid, pending.referralCode)
    } catch (e) { console.warn('referral link failed:', e) }
  }

  // Notify admins of the completed registration.
  try {
    const { notifyAllAdmins } = await import('./admin-notifications.service')
    await notifyAllAdmins({
      type: 'user_registered',
      title: 'Nuevo registro en SALVAJE',
      body: pending.source === 'admin'
        ? `${pending.displayName} completó el registro (invitado por ${pending.createdByName || 'admin'})`
        : `${pending.displayName} se registró ${pending.referralCode ? 'con código de referido' : 'directamente'}`,
      senderId: uid,
      senderName: pending.displayName,
      senderRole: 'user',
      relatedId: uid,
      relatedCollection: 'users',
      actionType: 'view_user',
      actionUrl: '/admin/users',
    })
  } catch {}

  // Clean up the pending doc.
  try { await deleteDoc(doc(db, 'pending_users', uid)) } catch {}

  return { alreadyFinalized: false }
}

/**
 * Build a pending_users payload from a self-signup form.
 */
export function buildSelfPendingPayload({ email, displayName, phone, birthDate, gender, referralCode, colegioMonteluna }) {
  return {
    source: 'self',
    email: (email || '').trim().toLowerCase(),
    displayName: (displayName || '').trim(),
    phone: (phone || '').trim(),
    dateOfBirth: birthDate || null,
    birthDate: birthDate || null,
    gender: gender || '',
    referralCode: referralCode || null,
    colegioMonteluna: !!colegioMonteluna,
    membershipType: 'none',
    membershipIsActive: false,
    hasUsedFreeTrial: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

/**
 * Build a pending_users payload for an admin-invited user. Optionally includes
 * membership preset linkage so finalize can wire activeMembershipPurchaseId.
 */
export function buildAdminPendingPayload({
  email, displayName, phone, dateOfBirth, gender,
  createdByUid, createdByName, colegioMonteluna = false,
  membershipPurchaseId = null, membershipType = null,
  membershipStartDate = null, membershipEndDate = null,
  ticketeraBalance = 0, hasUsedFreeTrial = false,
}) {
  return {
    source: 'admin',
    email: (email || '').trim().toLowerCase(),
    displayName: (displayName || '').trim(),
    phone: (phone || '').trim(),
    dateOfBirth: dateOfBirth || null,
    birthDate: dateOfBirth || null,
    gender: gender || '',
    referralCode: null,
    colegioMonteluna: !!colegioMonteluna,
    createdBy: createdByUid || null,
    createdByName: createdByName || null,
    activeMembershipPurchaseId: membershipPurchaseId,
    membershipType: membershipType || 'none',
    membershipIsActive: !!membershipPurchaseId,
    membershipStartDate,
    membershipEndDate,
    ticketeraBalance,
    hasUsedFreeTrial,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}
