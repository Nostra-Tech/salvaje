/**
 * Firebase Auth REST helpers — used when we need to create an Auth user WITHOUT
 * replacing the caller's current session. The Firebase JS SDK's
 * createUserWithEmailAndPassword always signs in as the newly-created user;
 * for admin flows and for the titular's linked-member registrations we need
 * to keep the caller authenticated.
 */
const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd + '!Aa9'
}

/**
 * Create an Auth account via the Identity Toolkit REST API.
 * Returns { localId (uid), idToken, email, ... }.
 *
 * The returned idToken belongs to the new user (NOT to the caller). Use it
 * only for cleanup operations on error (e.g. self-deleting the orphaned
 * account if a downstream Firestore write fails).
 */
export async function authSignUpRest(email, password = null) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: password || generateRandomPassword(),
        returnSecureToken: true,
      }),
    }
  )
  const data = await res.json()
  if (!res.ok) {
    if (data.error?.message === 'EMAIL_EXISTS') throw new Error('Ya existe una cuenta con ese email')
    throw new Error(data.error?.message || 'Error al crear el usuario en Auth')
  }
  return data
}

/**
 * Self-delete an Auth user using their own idToken — used to clean up
 * orphaned accounts when a downstream step fails so admin/user can retry.
 */
export async function authDeleteRest(idToken) {
  try {
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    )
  } catch { /* best-effort */ }
}

export { generateRandomPassword }
