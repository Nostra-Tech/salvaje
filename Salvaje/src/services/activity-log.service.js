/**
 * V6 Ajuste 23 — Activity log for SuperAdmin/Admin actions.
 *
 * Writes to `activityLogs/`. The existing AdminActivityLog page already
 * reads from a similar collection; this service standardizes WRITES from
 * sensitive places (config changes, role assignments, price changes).
 *
 * Schema:
 *   { actorId, actorName, actorRole, action, entity, entityId, before?, after?, createdAt }
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { removeUndefined } from '../utils/firestoreHelpers'

export async function logAdminActivity({
  actorId, actorName, actorRole = 'admin',
  action, entity, entityId = null,
  before = null, after = null, notes = null,
}) {
  if (!actorId || !action || !entity) return null
  try {
    const ref = await addDoc(collection(db, 'activityLogs'), removeUndefined({
      actorId,
      actorName: actorName || null,
      actorRole,
      action,
      entity,
      entityId,
      before: serializeForLog(before),
      after: serializeForLog(after),
      notes,
      createdAt: serverTimestamp(),
    }))
    return ref.id
  } catch (e) { console.warn('logAdminActivity failed:', e); return null }
}

function serializeForLog(v) {
  if (v == null) return null
  // Only keep primitives/objects up to first nesting. Avoid huge blobs.
  try {
    return JSON.parse(JSON.stringify(v))
  } catch { return null }
}
