import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { logActivity, startSession, getSessionId } from '../services/activity.service'

/**
 * Auto-track page navigation and time spent per page.
 * Mounts once at the AppShell/AdminShell root.
 */
export function useActivityTracker() {
  const { user, role, profile } = useAuth()
  const location = useLocation()
  const pageEnterRef = useRef(Date.now())
  const prevPathRef = useRef(null)

  // Start session when user logs in
  useEffect(() => {
    if (user?.uid) {
      if (!getSessionId()) startSession()
    }
  }, [user?.uid])

  // Page change tracking
  useEffect(() => {
    if (!user?.uid) return
    const userObj = { uid: user.uid, displayName: profile?.displayName || user.email, email: user.email, role }

    const prevPath = prevPathRef.current
    if (prevPath && prevPath !== location.pathname) {
      const duration = Math.round((Date.now() - pageEnterRef.current) / 1000)
      logActivity(userObj, 'page_exit', { page: prevPath, duration })
    }
    pageEnterRef.current = Date.now()
    prevPathRef.current = location.pathname
    logActivity(userObj, 'page_enter', { page: location.pathname })
  }, [location.pathname, user?.uid, role, profile?.displayName])

  // Beforeunload: log final page exit
  useEffect(() => {
    if (!user?.uid) return
    const handler = () => {
      const duration = Math.round((Date.now() - pageEnterRef.current) / 1000)
      // Note: addDoc may not complete on unload, fire and forget
      logActivity({ uid: user.uid, displayName: profile?.displayName, email: user.email, role }, 'session_end', {
        page: location.pathname,
        duration,
      })
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [user?.uid, role, profile?.displayName, location.pathname])
}
