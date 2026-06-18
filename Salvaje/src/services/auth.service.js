import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { buildSelfPendingPayload } from './registration.service'

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  return signOut(auth)
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

/**
 * Self-signup: creates the Firebase Auth account + a /pending_users/{uid} doc
 * with the form data, then sends an email-verification link. The /users/{uid}
 * doc is NOT written yet — that happens in finalizeRegistration() the first
 * time the user logs in with emailVerified=true.
 *
 * The Auth user is left signed in so the UI can immediately show the
 * "verify your email" screen and let them resend without re-authenticating.
 */
export async function registerUser({ email, password, displayName, phone, birthDate, gender, referralCode, colegioMonteluna }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  const uid = cred.user.uid

  // Store the signup form in the pending bucket.
  const pendingPayload = buildSelfPendingPayload({
    email, displayName, phone, birthDate, gender, referralCode, colegioMonteluna,
  })
  await setDoc(doc(db, 'pending_users', uid), pendingPayload)

  // Send Firebase's email-verification link. Returns the user to /auth-action.
  try {
    auth.languageCode = 'es'
    await sendEmailVerification(cred.user, {
      url: window.location.origin + '/login',
      handleCodeInApp: false,
    })
  } catch (e) { console.warn('sendEmailVerification failed:', e) }

  return cred
}

/**
 * Resend the verification email for the currently signed-in user.
 */
export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error('No hay sesión activa')
  auth.languageCode = 'es'
  await sendEmailVerification(auth.currentUser, {
    url: window.location.origin + '/login',
    handleCodeInApp: false,
  })
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function getUserRole(uid) {
  // V6 Ajuste 28: superadmin = any admin doc with `isSuperAdmin: true`.
  // We piggyback on the existing `admins/{uid}` collection (no schema migration).
  const adminDoc = await getDoc(doc(db, 'admins', uid))
  if (adminDoc.exists()) {
    const data = adminDoc.data() || {}
    return data.isSuperAdmin === true ? 'superadmin' : 'admin'
  }

  // Check coach
  const coachDoc = await getDoc(doc(db, 'coaches', uid))
  if (coachDoc.exists()) return 'coach'

  // Check user
  const userDoc = await getDoc(doc(db, 'users', uid))
  if (userDoc.exists()) return 'user'

  // Pending registration: Auth account exists but email not yet verified
  // (or admin invite not yet accepted). Signals useAuth to route to /verify-email.
  const pendingDoc = await getDoc(doc(db, 'pending_users', uid))
  if (pendingDoc.exists()) return 'pending'

  return null
}
