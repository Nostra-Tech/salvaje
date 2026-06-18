import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { onAuthChange } from '../services/auth.service'
import { subscribeToUser } from '../services/users.service'
import { subscribeToCoach } from '../services/coaches.service'
import { finalizeRegistration } from '../services/registration.service'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

// Wraps a Firestore getDoc with a hard timeout so the app never hangs
// if the network is down or Firebase takes too long to respond.
function getDocSafe(ref, ms = 6000) {
  return Promise.race([
    getDoc(ref),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firestore read timeout')), ms)
    ),
  ])
}

async function getUserRole(uid) {
  const adminDoc = await getDocSafe(doc(db, 'admins', uid))
  if (adminDoc.exists()) {
    const data = adminDoc.data() || {}
    return data.isSuperAdmin === true ? 'superadmin' : 'admin'
  }
  const coachDoc = await getDocSafe(doc(db, 'coaches', uid))
  if (coachDoc.exists()) return 'coach'
  const userDoc = await getDocSafe(doc(db, 'users', uid))
  if (userDoc.exists()) return 'user'
  const pendingDoc = await getDocSafe(doc(db, 'pending_users', uid))
  if (pendingDoc.exists()) return 'pending'
  return null
}

async function shouldPromote(firebaseUser) {
  const snap = await getDocSafe(doc(db, 'pending_users', firebaseUser.uid))
  if (!snap.exists()) return { promote: false, source: null }
  const data = snap.data() || {}
  if (data.source === 'admin') return { promote: true, source: 'admin' }
  if (firebaseUser.emailVerified) return { promote: true, source: 'self' }
  return { promote: false, source: data.source || 'self' }
}

// Module-level guard so the auth listener is only ever registered ONCE per app
// lifecycle, even across StrictMode double-mounts or multiple <AuthInit/>
// instances. Previously useAuth() was called from every guard/shell and each
// call registered its own onAuthStateChanged listener, which raced and kept
// resetting loading=true → the UI stayed stuck on the loader forever.
let authInitStarted = false
let cleanupRef = null

function initAuthOnce() {
  if (authInitStarted) return cleanupRef
  authInitStarted = true

  const store = useAuthStore.getState()
  let profileUnsub = null

  // Safety valve: if onAuthStateChanged never fires, unblock the UI after 10s.
  const globalTimer = setTimeout(() => {
    const s = useAuthStore.getState()
    if (!s.initialized) {
      s.setLoading(false)
      s.setInitialized(true)
    }
  }, 10000)

  const authUnsub = onAuthChange(async (firebaseUser) => {
    clearTimeout(globalTimer)

    if (profileUnsub) {
      profileUnsub()
      profileUnsub = null
    }

    if (!firebaseUser) {
      store.reset()
      useAuthStore.getState().setInitialized(true)
      return
    }

    const s = useAuthStore.getState()
    s.setLoading(true)
    s.setRole(null)
    s.setProfile(null)
    s.setUser(firebaseUser)

    const resolveTimer = setTimeout(() => {
      const ss = useAuthStore.getState()
      ss.setLoading(false)
      ss.setInitialized(true)
    }, 8000)

    try {
      let userRole = await getUserRole(firebaseUser.uid)
      if (!userRole) {
        await new Promise((r) => setTimeout(r, 600))
        userRole = await getUserRole(firebaseUser.uid)
      }

      if (userRole === 'pending') {
        const { promote } = await shouldPromote(firebaseUser)
        if (promote) {
          try {
            await finalizeRegistration(firebaseUser.uid)
            userRole = 'user'
          } catch (e) {
            console.error('finalizeRegistration failed:', e)
          }
        }
      }

      useAuthStore.getState().setRole(userRole)

      if (userRole === 'user') {
        profileUnsub = subscribeToUser(firebaseUser.uid, (data) =>
          useAuthStore.getState().setProfile(data)
        )
      } else if (userRole === 'coach') {
        profileUnsub = subscribeToCoach(firebaseUser.uid, (data) =>
          useAuthStore.getState().setProfile(data)
        )
      } else if (userRole === 'admin' || userRole === 'superadmin') {
        profileUnsub = onSnapshot(doc(db, 'admins', firebaseUser.uid), (snap) => {
          if (snap.exists())
            useAuthStore.getState().setProfile({ id: snap.id, ...snap.data() })
        })
      }
    } catch (err) {
      console.error('useAuth: role resolution failed', err)
      useAuthStore.getState().setRole(null)
    } finally {
      clearTimeout(resolveTimer)
      const ss = useAuthStore.getState()
      ss.setLoading(false)
      ss.setInitialized(true)
    }
  })

  cleanupRef = () => {
    clearTimeout(globalTimer)
    authUnsub()
    if (profileUnsub) profileUnsub()
    authInitStarted = false
    cleanupRef = null
  }
  return cleanupRef
}

// Mount this ONCE near the root of the app (inside <BrowserRouter/>).
// It owns the single auth listener. All other components read state via
// useAuth() which is now a pure store selector.
export function AuthInit() {
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    initAuthOnce()
    // No cleanup on unmount — the auth listener must live for the whole app
    // lifecycle. StrictMode unmount/remount would otherwise tear down the
    // single source of truth.
  }, [])
  return null
}

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  const initialized = useAuthStore((s) => s.initialized)
  return { user, role, profile, loading, initialized }
}
