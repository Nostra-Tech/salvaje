/**
 * Safe localStorage wrapper.
 *
 * Browser storage can throw at any access: Safari private mode disables it,
 * and a full origin (quota exceeded — often caused by extensions writing to
 * the page) makes even a tiny `setItem` throw. An unguarded throw inside a
 * React effect blanks the whole app, so every access here is wrapped.
 *
 * On a quota error, `safeSet` prunes the app's own day-stamped flag keys
 * (which accumulate one-per-day) and retries once before giving up silently.
 */

// Prefixes of the app's own keys that are safe to prune when storage is full.
const PRUNABLE_PREFIXES = [
  'birthday_greeting_',
  'birthday_check_',
  'membership_expiry_',
  'freeze_expiry_',
  'admin_alerts_',
]

function pruneAppKeys() {
  try {
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && PRUNABLE_PREFIXES.some((p) => k.startsWith(p))) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
    return toRemove.length
  } catch {
    return 0
  }
}

export function safeGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    // Likely quota exceeded — prune our own old flags and retry once.
    if (pruneAppKeys() > 0) {
      try {
        localStorage.setItem(key, value)
        return true
      } catch {
        /* still full (filled by something outside the app) — give up */
      }
    }
    return false
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
