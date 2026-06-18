import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

let SESSION_ID = null
let SESSION_START = null

export function startSession() {
  SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  SESSION_START = Date.now()
  try { sessionStorage.setItem('salvaje_session_id', SESSION_ID) } catch {}
  return SESSION_ID
}

export function getSessionId() {
  if (!SESSION_ID) {
    try { SESSION_ID = sessionStorage.getItem('salvaje_session_id') } catch {}
    if (!SESSION_ID) startSession()
  }
  return SESSION_ID
}

export function getSessionDuration() {
  if (!SESSION_START) return 0
  return Math.round((Date.now() - SESSION_START) / 1000)
}

function getDeviceInfo() {
  const ua = navigator.userAgent
  // Extract browser name only (no version, no PII)
  let browser = 'Unknown'
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome'
  else if (/Firefox/.test(ua)) browser = 'Firefox'
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari'
  else if (/Edg/.test(ua)) browser = 'Edge'
  return {
    isMobile: window.innerWidth < 768,
    screenWidth: window.innerWidth,
    userAgent: browser,
  }
}

/**
 * Log an action. Fire-and-forget. Errors swallowed (don't break UX).
 */
export async function logActivity(user, action, metadata = {}) {
  if (!user?.uid) return
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId: user.uid,
      userName: user.displayName || user.email || 'Usuario',
      userRole: user.role || 'user',
      action,
      metadata,
      sessionId: getSessionId(),
      timestamp: serverTimestamp(),
      deviceInfo: getDeviceInfo(),
    })
  } catch (e) {
    // ignore — don't block UX
  }
}

/**
 * For admin analytics: fetch logs with filters.
 */
export async function fetchActivityLogs({ days = 7, role, action, userId, max = 200 } = {}) {
  const since = new Date(); since.setDate(since.getDate() - days)
  let q = query(
    collection(db, 'activity_logs'),
    where('timestamp', '>=', Timestamp.fromDate(since)),
    orderBy('timestamp', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  let logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (role)   logs = logs.filter((l) => l.userRole === role)
  if (action) logs = logs.filter((l) => l.action === action)
  if (userId) logs = logs.filter((l) => l.userId === userId)
  return logs
}

/**
 * For user: fetch own activity history.
 */
export async function fetchMyActivity(uid, max = 50) {
  const q = query(
    collection(db, 'activity_logs'),
    where('userId', '==', uid),
    orderBy('timestamp', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function summarizeLogs(logs) {
  const uniqUsers = new Set()
  const sessions = new Set()
  const byAction = {}
  const byHour = Array(24).fill(0)
  const byDay = Array(7).fill(0)
  for (const l of logs) {
    uniqUsers.add(l.userId)
    if (l.sessionId) sessions.add(l.sessionId)
    byAction[l.action] = (byAction[l.action] || 0) + 1
    const d = l.timestamp?.toDate?.() || new Date()
    byHour[d.getHours()]++
    byDay[d.getDay()]++
  }
  // Find peak hour
  let peakHour = 0, peakHourCount = 0
  for (let h = 0; h < 24; h++) if (byHour[h] > peakHourCount) { peakHourCount = byHour[h]; peakHour = h }
  return {
    uniqueUsers: uniqUsers.size,
    sessions: sessions.size,
    totalActions: logs.length,
    byAction,
    byHour,
    byDay,
    peakHour,
  }
}
