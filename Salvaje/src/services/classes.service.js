import {
  collection, query, where, orderBy, getDocs, getDoc, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp, runTransaction,
  onSnapshot, Timestamp, limit, arrayUnion, arrayRemove, increment,
} from 'firebase/firestore'
import { db } from './firebase'
import { CLASS_STATUS, CLASS_AUTO_FINALIZE_MIN } from '../utils/constants'
import { notifyAllAdmins } from './admin-notifications.service'

export async function getUpcomingClasses(days = 14) {
  // Start window from start-of-today so users still see today's classes
  // even if the start time has already passed today.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const future = new Date(startOfToday)
  future.setDate(future.getDate() + days)

  // Include both `scheduled` and `in_progress` so users can see live classes too.
  const q = query(
    collection(db, 'classes'),
    where('status', 'in', [CLASS_STATUS.SCHEDULED, CLASS_STATUS.IN_PROGRESS]),
    where('scheduledDate', '>=', Timestamp.fromDate(startOfToday)),
    where('scheduledDate', '<=', Timestamp.fromDate(future)),
    orderBy('scheduledDate', 'asc')
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function subscribeToUpcomingClasses(days = 1, callback) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const future = new Date(startOfToday)
  future.setDate(future.getDate() + days)

  const q = query(
    collection(db, 'classes'),
    where('status', 'in', [CLASS_STATUS.SCHEDULED, CLASS_STATUS.IN_PROGRESS]),
    where('scheduledDate', '>=', Timestamp.fromDate(startOfToday)),
    where('scheduledDate', '<=', Timestamp.fromDate(future)),
    orderBy('scheduledDate', 'asc')
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function getAllClasses(daysBack = 7, daysForward = 14) {
  const start = new Date()
  start.setDate(start.getDate() - daysBack)
  const end = new Date()
  end.setDate(end.getDate() + daysForward)

  const q = query(
    collection(db, 'classes'),
    where('scheduledDate', '>=', Timestamp.fromDate(start)),
    where('scheduledDate', '<=', Timestamp.fromDate(end)),
    orderBy('scheduledDate', 'asc')
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export function subscribeToCoachClasses(coachId, callback, daysBack = 1, daysForward = 14) {
  const start = new Date(); start.setDate(start.getDate() - daysBack)
  const end = new Date(); end.setDate(end.getDate() + daysForward)
  const q = query(
    collection(db, 'classes'),
    where('coachId', '==', coachId),
    where('scheduledDate', '>=', Timestamp.fromDate(start)),
    where('scheduledDate', '<=', Timestamp.fromDate(end)),
    orderBy('scheduledDate', 'asc')
  )
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export async function getCoachClasses(coachId, daysBack = 7, daysForward = 14) {
  const start = new Date()
  start.setDate(start.getDate() - daysBack)
  const end = new Date()
  end.setDate(end.getDate() + daysForward)

  const q = query(
    collection(db, 'classes'),
    where('coachId', '==', coachId),
    where('scheduledDate', '>=', Timestamp.fromDate(start)),
    where('scheduledDate', '<=', Timestamp.fromDate(end)),
    orderBy('scheduledDate', 'asc')
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getClassById(classId) {
  const snap = await getDoc(doc(db, 'classes', classId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function subscribeToClass(classId, callback) {
  return onSnapshot(doc(db, 'classes', classId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
    else callback(null)
  })
}

export async function createClass(data) {
  const ref = await addDoc(collection(db, 'classes'), {
    ...data,
    attendeeList: [],
    currentBookings: 0,
    attendedCount: 0,
    status: CLASS_STATUS.SCHEDULED,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateClass(classId, data) {
  await updateDoc(doc(db, 'classes', classId), { ...data, updatedAt: serverTimestamp() })
}

export async function cancelClass(classId, reason) {
  await updateDoc(doc(db, 'classes', classId), {
    status: CLASS_STATUS.CANCELLED,
    cancellationReason: reason,
    updatedAt: serverTimestamp(),
  })
}

export async function reserveClass(classId, user) {
  await runTransaction(db, async (tx) => {
    const classRef = doc(db, 'classes', classId)
    const classSnap = await tx.get(classRef)

    if (!classSnap.exists()) throw new Error('Clase no encontrada')
    const cls = classSnap.data()

    if (cls.status !== CLASS_STATUS.SCHEDULED) throw new Error('Clase no disponible')
    if (cls.currentBookings >= cls.maxCapacity) throw new Error('Clase llena')

    const alreadyReserved = cls.attendeeList?.some((a) => a.userId === user.uid)
    if (alreadyReserved) throw new Error('Ya tienes reserva en esta clase')

    const attendee = {
      userId: user.uid,
      userName: user.displayName || user.email,
      userPhotoURL: user.profilePhotoURL || '',
      reservedAt: Timestamp.now(),
      checkedIn: false,
      checkedInAt: null,
      qrScanned: false,
      manualEntry: false,
      ticketeraConsumed: false,
    }

    tx.update(classRef, {
      currentBookings: increment(1),
      attendeeList: arrayUnion(attendee),
      updatedAt: Timestamp.now(),
    })
  })
}

export async function cancelReservation(classId, userId) {
  await runTransaction(db, async (tx) => {
    const classRef = doc(db, 'classes', classId)
    const classSnap = await tx.get(classRef)
    if (!classSnap.exists()) throw new Error('Clase no encontrada')

    const cls = classSnap.data()
    const attendee = cls.attendeeList?.find((a) => a.userId === userId)
    if (!attendee) throw new Error('No tienes reserva en esta clase')

    tx.update(classRef, {
      currentBookings: increment(-1),
      attendeeList: arrayRemove(attendee),
      updatedAt: Timestamp.now(),
    })
  })
}

/**
 * Find the most relevant class for a user to check into based on current time.
 * Returns the class where:
 *  - User is in attendeeList
 *  - Current time is within window of class start (default ±30 min before, until end+15 min)
 *  - Status is scheduled or in_progress
 * Returns null if no match.
 */
export async function findActiveClassForUser(userId, opts = {}) {
  const { windowBeforeMin = 30, windowAfterEndMin = 15 } = opts
  const now = new Date()
  const start = new Date(now.getTime() - 4 * 60 * 60 * 1000) // search ±4h
  const end   = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  const q = query(
    collection(db, 'classes'),
    where('scheduledDate', '>=', Timestamp.fromDate(start)),
    where('scheduledDate', '<=', Timestamp.fromDate(end)),
    orderBy('scheduledDate', 'asc')
  )
  const snaps = await getDocs(q)
  const candidates = snaps.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => {
      if (c.status === CLASS_STATUS.CANCELLED || c.status === CLASS_STATUS.COMPLETED) return false
      if (!c.attendeeList?.some((a) => a.userId === userId)) return false
      const startD = c.scheduledDate?.toDate ? c.scheduledDate.toDate() : new Date(c.scheduledDate)
      const endD   = c.endDate?.toDate ? c.endDate.toDate() : new Date(c.endDate)
      const earliestCheckIn = new Date(startD.getTime() - windowBeforeMin * 60 * 1000)
      const latestCheckIn   = new Date(endD.getTime()   + windowAfterEndMin * 60 * 1000)
      return now >= earliestCheckIn && now <= latestCheckIn
    })
  // Pick the one closest to now (smallest |start - now|)
  candidates.sort((a, b) => {
    const aD = a.scheduledDate?.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate)
    const bD = b.scheduledDate?.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate)
    return Math.abs(aD - now) - Math.abs(bD - now)
  })
  return candidates[0] || null
}

/**
 * For coach payroll: returns all completed classes where the coach taught,
 * within an optional date range. Auto-derives "completed" by endDate < now if status still scheduled.
 */
export async function getCoachCompletedClasses(coachId, fromDate, toDate) {
  const q = query(
    collection(db, 'classes'),
    where('coachId', '==', coachId),
    where('scheduledDate', '>=', Timestamp.fromDate(fromDate)),
    where('scheduledDate', '<=', Timestamp.fromDate(toDate)),
    orderBy('scheduledDate', 'asc')
  )
  const snaps = await getDocs(q)
  const now = new Date()
  return snaps.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => {
      if (c.status === CLASS_STATUS.CANCELLED) return false
      if (c.status === CLASS_STATUS.COMPLETED) return true
      // Auto-mark as completed if endDate has passed
      const endD = c.endDate?.toDate ? c.endDate.toDate() : new Date(c.endDate)
      return endD < now
    })
}

export async function checkInUser(classId, userId, manual = false) {
  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)
  if (!classSnap.exists()) throw new Error('Clase no encontrada')

  const cls = classSnap.data()
  const attendeeList = [...(cls.attendeeList || [])]
  const idx = attendeeList.findIndex((a) => a.userId === userId)

  if (idx === -1) throw new Error('Usuario no reservó esta clase')
  if (attendeeList[idx].checkedIn) throw new Error('Ya registrado')

  attendeeList[idx] = {
    ...attendeeList[idx],
    checkedIn: true,
    checkedInAt: Timestamp.now(),
    qrScanned: !manual,
    manualEntry: manual,
  }

  await updateDoc(classRef, {
    attendeeList,
    attendedCount: increment(1),
    updatedAt: Timestamp.now(),
  })
}

function _parseEndTime(startDate, endVal) {
  if (!endVal) return null
  if (endVal?.toDate) return endVal.toDate()
  if (typeof endVal === 'string' && endVal.includes(':')) {
    const [h, m] = endVal.split(':').map(Number)
    const d = new Date(startDate); d.setHours(h, m, 0, 0)
    return d
  }
  return new Date(endVal)
}

/**
 * Auto-finalize any stale classes:
 *   - status=scheduled and end time passed >CLASS_AUTO_FINALIZE_MIN ago (coach never opened it)
 *   - status=in_progress and end time passed >CLASS_AUTO_FINALIZE_MIN ago (coach started but never closed)
 *
 * Runs the full finalize side-effects: consume courtesies, create surveys,
 * notify no-shows, accrue payroll for in_progress classes the coach taught.
 *
 * Returns the same array with stale entries updated locally for instant UI sync.
 */
export async function autoFinalizeStaleClasses(classes) {
  const now = new Date()
  const thresholdMs = CLASS_AUTO_FINALIZE_MIN * 60 * 1000
  const stale = (classes || []).filter((c) => {
    if (c.status !== CLASS_STATUS.SCHEDULED && c.status !== CLASS_STATUS.IN_PROGRESS) return false
    const start = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate)
    const end = _parseEndTime(start, c.endDate || c.endTime)
    if (!end) return false
    return (now - end) > thresholdMs
  })
  if (stale.length === 0) return classes

  // Lazy-load cross-service deps to avoid import cycles.
  const [
    { consumeCourtesyOnFinalize, createPendingSurveysForClass, notifyNoShowsForClass },
    { addClassToPayroll },
    { getCoachById },
  ] = await Promise.all([
    import('./attendance.service'),
    import('./payroll.service'),
    import('./coaches.service'),
  ])

  await Promise.all(stale.map(async (c) => {
    try {
      const wasInProgress = c.status === CLASS_STATUS.IN_PROGRESS
      const checkedInCount = (c.attendeeList || []).filter((a) => a.checkedIn).length
      await updateDoc(doc(db, 'classes', c.id), {
        status: CLASS_STATUS.COMPLETED,
        autoFinalized: true,
        autoFinalizedReason: wasInProgress ? 'past_end_in_progress' : 'past_end_no_action',
        attendedCount: checkedInCount,
        actualEndTime: Timestamp.now(),
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      // Coach started this class — counts for payroll.
      if (wasInProgress && c.coachId) {
        try {
          const coach = await getCoachById(c.coachId)
          await addClassToPayroll(c, coach)
        } catch (e) { console.warn('payroll (auto) failed:', e) }
      }

      try { await consumeCourtesyOnFinalize(c.id) } catch (e) { console.warn('consumeCourtesy (auto) failed:', e) }
      try { await createPendingSurveysForClass(c.id) } catch (e) { console.warn('createPendingSurveys (auto) failed:', e) }
      try { await notifyNoShowsForClass(c.id) } catch (e) { console.warn('no-show notif (auto) failed:', e) }

      // Notify admins so the live dashboard reflects the closure.
      try {
        await notifyAllAdmins({
          type: 'class_auto_finalized',
          title: wasInProgress ? 'Clase cerrada sola · coach no la finalizo' : 'Clase cerrada sola · sin coach al mando',
          body: `"${c.name}" se cerro automaticamente pasados ${CLASS_AUTO_FINALIZE_MIN} min del fin programado. ${checkedInCount} asistente${checkedInCount === 1 ? '' : 's'} registrado${checkedInCount === 1 ? '' : 's'}.`,
          senderRole: 'system',
          relatedId: c.id,
          relatedCollection: 'classes',
          actionType: 'view',
          actionUrl: '/admin/classes',
        })
      } catch {}
    } catch (e) { console.warn('auto-finalize failed for', c.id, e) }
  }))

  const staleIds = new Set(stale.map((c) => c.id))
  return classes.map((c) => staleIds.has(c.id)
    ? { ...c, status: CLASS_STATUS.COMPLETED, autoFinalized: true }
    : c)
}

/**
 * V7 Ajuste 3: Coach finaliza clase (la marca como COMPLETED).
 * Validación: No puede finalizar antes de que haya pasado el 80% de la duración.
 *
 * Ejemplo: Clase 60 min, 80% = 48 min. Solo puede finalizar después de 48 min del inicio.
 */
export async function finalizeClass(classId, coachId) {
  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)
  if (!classSnap.exists()) throw new Error('Clase no encontrada')

  const cls = classSnap.data()

  // Verificar que es el coach de la clase
  if (cls.coachId !== coachId) {
    throw new Error('Solo el coach de la clase puede finalizarla')
  }

  // Validación de tiempo mínimo: 80% de la duración
  const scheduledStart = cls.scheduledDate?.toDate?.() ??
    cls.startDatetime?.toDate?.() ??
    null

  if (scheduledStart) {
    const durationMinutes = cls.durationMinutes ?? 60
    const minDurationSeconds = Math.floor(durationMinutes * 0.8 * 60)
    const minimumEndTime = new Date(scheduledStart.getTime() + minDurationSeconds * 1000)
    const now = new Date()

    if (now < scheduledStart) {
      throw new Error('No puedes finalizar una clase que aún no ha comenzado.')
    }

    if (now < minimumEndTime) {
      const remainingSeconds = Math.ceil((minimumEndTime - now) / 1000)
      const remainingMinutes = Math.ceil(remainingSeconds / 60)
      throw new Error(
        `Aún faltan ${remainingMinutes} min para poder finalizar esta clase. ` +
        `La tribu necesita ese tiempo. (${Math.round((now - scheduledStart) / 1000 / 60)}/${durationMinutes} min transcurridos)`
      )
    }
  }

  // Marcar clase como completada
  await updateDoc(classRef, {
    status: CLASS_STATUS.COMPLETED,
    completedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  // Notificar al admin que la clase fue finalizada
  notifyAllAdmins({
    type: 'class_finalized',
    title: 'Clase finalizada',
    body: `${cls.coachName || 'Un coach'} finalizó "${cls.name || cls.title || 'la clase'}" con ${cls.attendeeList?.length ?? 0} asistentes.`,
    relatedId: classId,
    relatedCollection: 'classes',
    actionType: 'view',
    actionUrl: '/admin/classes',
    senderRole: 'coach',
    senderName: cls.coachName || 'Coach',
  }).catch(() => {})
}
