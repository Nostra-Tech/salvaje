/**
 * Firestore safety helpers.
 * Prevent runtime errors from undefined values being passed to set/update operations.
 */
import { Timestamp } from 'firebase/firestore'

/**
 * Recursively remove `undefined` keys from an object.
 * Preserves null, dates, Timestamps, arrays, and FieldValue sentinels.
 *
 * @param {*} obj - any value
 * @returns sanitized clone with no undefined keys
 */
export function removeUndefined(obj) {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Date) return obj
  if (obj instanceof Timestamp) return obj
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter((v) => v !== undefined)
  }
  // FieldValue sentinels (serverTimestamp, increment, arrayUnion) — preserve as-is
  if (typeof obj === 'object') {
    // Heuristic: FieldValue has a _methodName property
    if ('_methodName' in obj || '_op' in obj) return obj
    const cleaned = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue
      cleaned[key] = removeUndefined(value)
    }
    return cleaned
  }
  return obj
}

/**
 * Best-effort: pick the first non-empty string from a list of candidates.
 * Useful for displayName fallbacks.
 */
export function firstString(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return null
}
